// imports
import axios, { AxiosResponse } from "axios"
import { BITBOX } from "bitbox-sdk"
import * as express from "express"
import * as util from "util"
import {
  MaskDetailsInterface
} from "./interfaces/RESTInterfaces"
import logger = require("./logging.js")
import routeUtils = require("./route-utils")
import wlogger = require("../../util/winston-logging")

// consts
const router: express.Router = express.Router()
const bitbox: BITBOX = new BITBOX()
const SLPSDK: any = require("slp-sdk")
const SLP: any = new SLPSDK()
let Utils = SLP.slpjs.Utils

// Used for processing error messages before sending them to the user.
util.inspect.defaultOptions = { depth: 1 }

// Use the default (and max) page size of 1000
// https://github.com/bitpay/insight-api#notes-on-upgrading-from-v03
const PAGE_SIZE: number = 1000

const axiosTimeOut = axios.create({
  timeout: 15000
})

// Connect the route endpoints to their handler functions.
router.get("/", root)
router.get("/details/:id", detailsSingle)
router.post("/details", detailsBulk)

// Root API endpoint. Simply acknowledges that it exists.
function root(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): express.Response {
  return res.json({ status: "mask" })
}

// Query the Insight API for details on a single BCH address.
// Returns a Promise.
async function detailsFromInsight(
  thisAddress: string,
  currentPage: number = 0
): Promise<MaskDetailsInterface> {
  try {
    let addr: string
    if (
      process.env.BITCOINCOM_BASEURL === "https://bch-insight.bitpay.com/api/"
    ) {
      addr = bitbox.Address.toCashAddress(thisAddress)
    } else {
      addr = bitbox.Address.toLegacyAddress(thisAddress)
    }

    let path: string = `${process.env.BITCOINCOM_BASEURL}addr/${addr}`

    // Set from and to params based on currentPage and pageSize
    // https://github.com/bitpay/insight-api/blob/master/README.md#notes-on-upgrading-from-v02
    const from: number = currentPage * PAGE_SIZE
    const to: number = from + PAGE_SIZE
    path = `${path}?from=${from}&to=${to}`

    // Query the Insight server.
    const axiosResponse: AxiosResponse = await axiosTimeOut.get(path)
    const retData: MaskDetailsInterface = axiosResponse.data

    // Calculate pagesTotal from response
    const pagesTotal: number = Math.ceil(retData.txApperances / PAGE_SIZE)

    // Append different address formats to the return data.
    retData.legacyAddress = bitbox.Address.toLegacyAddress(retData.addrStr)
    retData.cashAddress = bitbox.Address.toCashAddress(retData.addrStr)
    retData.slpAddress = Utils.toSlpAddress(retData.cashAddress)
    delete retData.addrStr

    // Append pagination information to the return data.
    retData.currentPage = currentPage
    retData.pagesTotal = pagesTotal

    return retData
  } catch (err) {
    // Dev Note: Do not log error messages here. Throw them instead and let the
    // parent function handle it.
    throw err
  }
}

// GET handler for single address details
async function detailsSingle(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): Promise<express.Response> {
  try {
    const address: string = req.params.address
    const currentPage: number = req.query.page
      ? parseInt(req.query.page, 10)
      : 0

    if (!address || address === "") {
      res.status(400)
      return res.json({ error: "address can not be empty" })
    }

    // Reject if address is an array.
    if (Array.isArray(address)) {
      res.status(400)
      return res.json({
        error: "address can not be an array. Use POST for bulk upload."
      })
    }

    logger.debug(`Executing address/detailsSingle with this address: `, address)
    wlogger.debug(
      `Executing address/detailsSingle with this address: `,
      address
    )

    // Ensure the input is a valid BCH address.
    try {
      bitbox.Address.toLegacyAddress(address)
    } catch (err) {
      res.status(400)
      return res.json({
        error: `Invalid BCH address. Double check your address is valid: ${address}`
      })
    }

    // Prevent a common user error. Ensure they are using the correct network address.
    const networkIsValid: boolean = routeUtils.validateNetwork(
      Utils.toLegacyAddress(address)
    )
    if (!networkIsValid) {
      res.status(400)
      return res.json({
        error: `Invalid network. Trying to use a testnet address on mainnet, or vice versa.`
      })
    }

    // Query the Insight API.
    let retData: MaskDetailsInterface = await detailsFromInsight(
      address,
      currentPage
    )

    // Return the retrieved address information.
    res.status(200)
    return res.json(retData)
  } catch (err) {
    // Attempt to decode the error message.
    const { msg, status } = routeUtils.decodeError(err)
    if (msg) {
      res.status(status)
      return res.json({ error: msg })
    }

    // Write out error to error log.
    //logger.error(`Error in address.ts/detailsSingle: `, err)
    wlogger.error(`Error in address.ts/detailsSingle().`, err)

    res.status(500)
    return res.json({ error: util.inspect(err) })
  }
}

// POST handler for bulk queries on address details
async function detailsBulk(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): Promise<express.Response> {
  try {
    let addresses: string[] = req.body.addresses
    const currentPage: number = req.body.page ? parseInt(req.body.page, 10) : 0

    // Reject if addresses is not an array.
    if (!Array.isArray(addresses)) {
      res.status(400)
      return res.json({
        error: "addresses needs to be an array. Use GET for single address."
      })
    }

    // Enforce array size rate limits
    if (!routeUtils.validateArraySize(req, addresses)) {
      res.status(429) //
      return res.json({
        error: `Array too large.`
      })
    }

    logger.debug(`Executing address/details with these addresses: `, addresses)
    wlogger.debug(`Executing address/details with these addresses: `, addresses)

    // Validate each element in the address array.
    for (let i: number = 0; i < addresses.length; i++) {
      const thisAddress: string = addresses[i]
      // Ensure the input is a valid BCH address.
      try {
        bitbox.Address.toLegacyAddress(thisAddress)
      } catch (err) {
        res.status(400)
        return res.json({
          error: `Invalid BCH address. Double check your address is valid: ${thisAddress}`
        })
      }

      // Prevent a common user error. Ensure they are using the correct network address.
      const networkIsValid: boolean = routeUtils.validateNetwork(
        Utils.toCashAddress(thisAddress)
      )
      if (!networkIsValid) {
        res.status(400)
        return res.json({
          error: `Invalid network for address ${thisAddress}. Trying to use a testnet address on mainnet, or vice versa.`
        })
      }
    }

    // Loops through each address and creates an array of Promises, querying
    // Insight API in parallel.
    let addressPromises: Promise<MaskDetailsInterface>[] = addresses.map(
      async (address: any): Promise<MaskDetailsInterface> => {
        return detailsFromInsight(address, currentPage)
      }
    )

    // Wait for all parallel Insight requests to return.
    let result: MaskDetailsInterface[] = await Promise.all(addressPromises)

    // Return the array of retrieved address information.
    res.status(200)
    return res.json(result)
  } catch (err) {
    // Attempt to decode the error message.
    const { msg, status } = routeUtils.decodeError(err)
    if (msg) {
      res.status(status)
      return res.json({ error: msg })
    }

    //logger.error(`Error in detailsBulk(): `, err)
    wlogger.error(`Error in address.ts/detailsBulk().`, err)

    res.status(500)
    return res.json({ error: util.inspect(err) })
  }
}

module.exports = {
  router,
  testableComponents: {
    root,
    detailsBulk,
    detailsSingle
  }
}
