const chai = require("chai")
const assert = chai.assert
const maskRoute = require("../../dist/routes/v1/mask")
const nock = require("nock") // HTTP mocking

let originalUrl // Used during transition from integration to unit tests.

// Mocking data.
const { mockReq, mockRes } = require("./mocks/express-mocks")
const mockData = require("./mocks/mask-mock")

// Used for debugging.
const util = require("util")
util.inspect.defaultOptions = { depth: 1 }

describe("#MaskRouter", () => {
  let req, res

  before(() => {
    originalUrl = process.env.BITCOINCOM_BASEURL

    // Set default environment variables for unit tests.
    if (!process.env.TEST) process.env.TEST = "unit"
    if (process.env.TEST === "unit")
      process.env.BITCOINCOM_BASEURL = "http://fakeurl/api/"

    // console.log(`Testing type is: ${process.env.TEST}`)
  })

  // Setup the mocks before each test.
  beforeEach(() => {
    // Mock the req and res objects used by Express routes.
    req = mockReq
    res = mockRes

    // Explicitly reset the parmas and body.
    req.params = {}
    req.body = {}
    req.query = {}

    // Activate nock if it's inactive.
    if (!nock.isActive()) nock.activate()
  })

  afterEach(() => {
    // Clean up HTTP mocks.
    nock.cleanAll() // clear interceptor list.
    nock.restore()
  })

  after(() => {
    process.env.BITCOINCOM_BASEURL = originalUrl
  })

  describe("#root", () => {
    // root route handler.
    const root = maskRoute.testableComponents.root

    it("should respond to GET for base route", async () => {
      const result = root(req, res)

      assert.equal(result.status, "mask", "Returns static string")
    })
  })

  describe("#maskDetailsBulk", () => {
    // details route handler.
    const detailsBulk = maskRoute.testableComponents.detailsBulk

    it("should throw an error for an empty body", async () => {
      req.body = {}

      const result = await detailsBulk(req, res)
      //console.log(`result: ${util.inspect(result)}`)

      assert.equal(res.statusCode, 400, "HTTP status code 400 expected.")
      assert.include(
        result.error,
        "maskes needs to be an array",
        "Proper error message"
      )
    })

    it("should error on non-array single mask", async () => {
      req.body = {
        mask: `qzs02v05l7qs5s24srqju498qu55dwuj0cx5ehjm2c`
      }

      const result = await detailsBulk(req, res)

      assert.equal(res.statusCode, 400, "HTTP status code 400 expected.")
      assert.include(
        result.error,
        "maskes needs to be an array",
        "Proper error message"
      )
    })

    it("should throw an error for an invalid mask", async () => {
      req.body = {
        maskes: [`02v05l7qs5s24srqju498qu55dwuj0cx5ehjm2c`]
      }

      const result = await detailsBulk(req, res)

      assert.equal(res.statusCode, 400, "HTTP status code 400 expected.")
      assert.include(
        result.error,
        "Invalid BCH mask",
        "Proper error message"
      )
    })

    it("should throw 400 error if maskes array is too large", async () => {
      const testArray = []
      for (var i = 0; i < 25; i++) testArray.push("")

      req.body.maskes = testArray

      const result = await detailsBulk(req, res)
      //console.log(`result: ${util.inspect(result)}`)

      assert.hasAllKeys(result, ["error"])
      assert.include(result.error, "Array too large")
    })

    it("should detect a network mismatch", async () => {
      req.body = {
        maskes: [`bitcoincash:qqqvv56zepke5k0xeaehlmjtmkv9ly2uzgkxpajdx3`]
      }

      const result = await detailsBulk(req, res)
      //console.log(`result: ${util.inspect(result)}`)

      assert.equal(res.statusCode, 400, "HTTP status code 400 expected.")
      assert.include(result.error, "Invalid network", "Proper error message")
    })

    it("should throw 500 when network issues", async () => {
      const savedUrl = process.env.BITCOINCOM_BASEURL

      try {
        req.body = {
          maskes: [`bchtest:qq89kjkeqz9mngp8kl3dpmu43y2wztdjqu500gn4c4`]
        }

        // Switch the Insight URL to something that will error out.
        process.env.BITCOINCOM_BASEURL = "http://fakeurl/api/"

        const result = await detailsBulk(req, res)
        //console.log(`network issue result: ${util.inspect(result)}`)

        // Restore the saved URL.
        process.env.BITCOINCOM_BASEURL = savedUrl

        assert.isAbove(res.statusCode, 499, "HTTP status code 500 expected.")
        //assert.include(result.error, "ENOTFOUND", "Error message expected")
        assert.include(
          result.error,
          "Network error: Could not communicate",
          "Error message expected"
        )
      } catch (err) {
        // Restore the saved URL.
        process.env.BITCOINCOM_BASEURL = savedUrl
      }
    })

    it("should default to page 0", async () => {
      req.body = {
        maskes: [`bchtest:qq89kjkeqz9mngp8kl3dpmu43y2wztdjqu500gn4c4`]
      }

      // Mock the Insight URL for unit tests.
      if (process.env.TEST === "unit") {
        nock(`${process.env.BITCOINCOM_BASEURL}`)
          .get(`/addr/mgps7qxk2Z5ma4mXsviznnet8wx4VvMPFz?from=0&to=1000`)
          .reply(200, mockData.mockmaskDetails)
      }

      // Call the details API.
      const result = await detailsBulk(req, res)
      //console.log(`result: ${util.inspect(result)}`)

      // Assert current page defaults to 0
      assert.equal(result[0].currentPage, 0)
    })

    it("should process the requested page", async () => {
      req.body = {
        maskes: [`bchtest:qq89kjkeqz9mngp8kl3dpmu43y2wztdjqu500gn4c4`],
        page: 5
      }

      // Mock the Insight URL for unit tests.
      if (process.env.TEST === "unit") {
        nock(`${process.env.BITCOINCOM_BASEURL}`)
          .get(`/addr/mgps7qxk2Z5ma4mXsviznnet8wx4VvMPFz?from=5000&to=6000`)
          .reply(200, mockData.mockmaskDetails)
      }

      // Call the details API.
      const result = await detailsBulk(req, res)
      //console.log(`result: ${util.inspect(result)}`)

      // Assert current page is same as requested
      assert.equal(result[0].currentPage, 5)
    })

    it("should calculate the total number of pages", async () => {
      req.body = {
        maskes: [`bchtest:qq89kjkeqz9mngp8kl3dpmu43y2wztdjqu500gn4c4`]
      }

      // Mock the Insight URL for unit tests.
      if (process.env.TEST === "unit") {
        nock(`${process.env.BITCOINCOM_BASEURL}`)
          .get(`/addr/mgps7qxk2Z5ma4mXsviznnet8wx4VvMPFz?from=0&to=1000`)
          .reply(200, mockData.mockmaskDetails)
      }

      // Call the details API.
      const result = await detailsBulk(req, res)
      //console.log(`result: ${util.inspect(result)}`)

      assert.equal(result[0].pagesTotal, 1)
    })

    it("should get details for a single mask", async () => {
      req.body = {
        maskes: [`bchtest:qq89kjkeqz9mngp8kl3dpmu43y2wztdjqu500gn4c4`]
      }

      // Mock the Insight URL for unit tests.
      if (process.env.TEST === "unit") {
        nock(`${process.env.BITCOINCOM_BASEURL}`)
          .get(`/addr/mgps7qxk2Z5ma4mXsviznnet8wx4VvMPFz?from=0&to=1000`)
          .reply(200, mockData.mockmaskDetails)
      }

      // Call the details API.
      const result = await detailsBulk(req, res)
      // console.log(`result: ${util.inspect(result)}`)

      // Assert that required fields exist in the returned object.
      assert.equal(result.length, 1, "Array with one entry")
      assert.hasAllKeys(result[0], [
        "balance",
        "balanceSat",
        "totalReceived",
        "totalReceivedSat",
        "totalSent",
        "totalSentSat",
        "unconfirmedBalance",
        "unconfirmedBalanceSat",
        "unconfirmedTxApperances",
        "txApperances",
        "transactions",
        "legacymask",
        "cashmask",
        "slpmask",
        "currentPage",
        "pagesTotal"
      ])
    })

    it("should get details for multiple maskes", async () => {
      req.body = {
        maskes: [
          `bchtest:qq89kjkeqz9mngp8kl3dpmu43y2wztdjqu500gn4c4`,
          `bchtest:qzknfggae0av6yvxk77gmyq7syc67yux6sk80haqyr`
        ]
      }

      // Mock the Insight URL for unit tests.
      if (process.env.TEST === "unit") {
        nock(`${process.env.BITCOINCOM_BASEURL}`)
          .get(`/addr/mgps7qxk2Z5ma4mXsviznnet8wx4VvMPFz?from=0&to=1000`)
          .reply(200, mockData.mockmaskDetails)

        nock(`${process.env.BITCOINCOM_BASEURL}`)
          .get(`/addr/mwJnEzXzKkveF2q5Af9jxi9j1zrtWAnPU8?from=0&to=1000`)
          .reply(200, mockData.mockmaskDetails)
      }

      // Call the details API.
      const result = await detailsBulk(req, res)
      // console.log(`result: ${util.inspect(result)}`)

      assert.isArray(result)
      assert.equal(result.length, 2, "2 outputs for 2 inputs")
    })
  })

  describe("#MaskDetailsSingle", () => {
    // details route handler.
    const detailsSingle = maskRoute.testableComponents.detailsSingle

    it("should throw 400 if mask is empty", async () => {
      const result = await detailsSingle(req, res)
      //console.log(`result: ${util.inspect(result)}`)

      assert.hasAllKeys(result, ["error"])
      assert.include(result.error, "mask can not be empty")
    })

    it("should error on an array", async () => {
      req.params.mask = [`qzs02v05l7qs5s24srqju498qu55dwuj0cx5ehjm2c`]

      const result = await detailsSingle(req, res)

      assert.equal(res.statusCode, 400, "HTTP status code 400 expected.")
      assert.include(
        result.error,
        "mask can not be an array",
        "Proper error message"
      )
    })

    it("should throw an error for an invalid mask", async () => {
      req.params.mask = `02v05l7qs5s24srqju498qu55dwuj0cx5ehjm2c`

      const result = await detailsSingle(req, res)

      assert.equal(res.statusCode, 400, "HTTP status code 400 expected.")
      assert.include(
        result.error,
        "Invalid BCH mask",
        "Proper error message"
      )
    })

    it("should detect a network mismatch", async () => {
      req.params.mask = `bitcoincash:qqqvv56zepke5k0xeaehlmjtmkv9ly2uzgkxpajdx3`

      const result = await detailsSingle(req, res)

      assert.equal(res.statusCode, 400, "HTTP status code 400 expected.")
      assert.include(result.error, "Invalid network", "Proper error message")
    })

    it("should throw 500 when network issues", async () => {
      const savedUrl = process.env.BITCOINCOM_BASEURL

      try {
        req.params.mask = `qzs02v05l7qs5s24srqju498qu55dwuj0cx5ehjm2c`

        // Switch the Insight URL to something that will error out.
        process.env.BITCOINCOM_BASEURL = "http://fakeurl/api/"

        const result = await detailsSingle(req, res)

        // Restore the saved URL.
        process.env.BITCOINCOM_BASEURL = savedUrl

        assert.equal(res.statusCode, 500, "HTTP status code 500 expected.")
        assert.include(result.error, "ENOTFOUND", "Error message expected")
      } catch (err) {
        // Restore the saved URL.
        process.env.BITCOINCOM_BASEURL = savedUrl
      }
    })

    it("should default to page 0", async () => {
      req.params.mask = `bchtest:qq89kjkeqz9mngp8kl3dpmu43y2wztdjqu500gn4c4`

      // Mock the Insight URL for unit tests.
      if (process.env.TEST === "unit") {
        nock(`${process.env.BITCOINCOM_BASEURL}`)
          .get(`/addr/mgps7qxk2Z5ma4mXsviznnet8wx4VvMPFz?from=0&to=1000`)
          .reply(200, mockData.mockmaskDetails)
      }

      // Call the details API.
      const result = await detailsSingle(req, res)
      //console.log(`result: ${util.inspect(result)}`)

      // Assert current page defaults to 0
      assert.equal(result.currentPage, 0)
    })

    it("should process the requested page", async () => {
      req.params.mask = `bchtest:qq89kjkeqz9mngp8kl3dpmu43y2wztdjqu500gn4c4`
      req.query.page = 5

      // Mock the Insight URL for unit tests.
      if (process.env.TEST === "unit") {
        nock(`${process.env.BITCOINCOM_BASEURL}`)
          .get(`/addr/mgps7qxk2Z5ma4mXsviznnet8wx4VvMPFz?from=5000&to=6000`)
          .reply(200, mockData.mockmaskDetails)
      }

      // Call the details API.
      const result = await detailsSingle(req, res)

      // Assert current page is same as requested
      assert.equal(result.currentPage, 5)
    })

    it("should calculate the total number of pages", async () => {
      req.params.mask = `bchtest:qq89kjkeqz9mngp8kl3dpmu43y2wztdjqu500gn4c4`

      // Mock the Insight URL for unit tests.
      if (process.env.TEST === "unit") {
        nock(`${process.env.BITCOINCOM_BASEURL}`)
          .get(`/addr/mgps7qxk2Z5ma4mXsviznnet8wx4VvMPFz?from=0&to=1000`)
          .reply(200, mockData.mockmaskDetails)
      }

      // Call the details API.
      const result = await detailsSingle(req, res)

      assert.equal(result.pagesTotal, 1)
    })

    it("should get details for a single mask", async () => {
      req.params.mask = `bchtest:qq89kjkeqz9mngp8kl3dpmu43y2wztdjqu500gn4c4`

      // Mock the Insight URL for unit tests.
      if (process.env.TEST === "unit") {
        nock(`${process.env.BITCOINCOM_BASEURL}`)
          .get(`/addr/mgps7qxk2Z5ma4mXsviznnet8wx4VvMPFz?from=0&to=1000`)
          .reply(200, mockData.mockmaskDetails)
      }

      // Call the details API.
      const result = await detailsSingle(req, res)
      //console.log(`result: ${util.inspect(result)}`)

      // Assert that required fields exist in the returned object.
      assert.hasAllKeys(result, [
        "balance",
        "balanceSat",
        "totalReceived",
        "totalReceivedSat",
        "totalSent",
        "totalSentSat",
        "unconfirmedBalance",
        "unconfirmedBalanceSat",
        "unconfirmedTxApperances",
        "txApperances",
        "transactions",
        "legacymask",
        "cashmask",
        "slpmask",
        "currentPage",
        "pagesTotal"
      ])
    })
  })
})
