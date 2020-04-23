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

// Query the Insight API for details on a single BCH masks.
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

    // Append different masks formats to the return data.
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

// GET handler for single mask details
async function detailsSingle(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): Promise<express.Response> {
  try {
    const mask: string = req.params.mask
    const currentPage: number = req.query.page
      ? parseInt(req.query.page, 10)
      : 0

    if (!mask || mask === "") {
      res.status(400)
      return res.json({ error: "mask can not be empty" })
    }

    // Reject if mask is an array.
    if (Array.isArray(mask)) {
      res.status(400)
      return res.json({
        error: "mask can not be an array. Use POST for bulk upload."
      })
    }

    logger.debug(`Executing mask/detailsSingle with this mask: `, mask)
    wlogger.debug(
      `Executing mask/detailsSingle with this mask: `,
      mask
    )

    // Ensure the input is a valid BCH mask.
    try {
      bitbox.Address.toLegacyAddress(mask)
    } catch (err) {
      res.status(400)
      return res.json({
        error: `Invalid BCH mask. Double check your mask is valid: ${mask}`
      })
    }

    // Prevent a common user error. Ensure they are using the correct network mask.
    const networkIsValid: boolean = routeUtils.validateNetwork(
      Utils.toLegacyAddress(mask)
    )
    if (!networkIsValid) {
      res.status(400)
      return res.json({
        error: `Invalid network. Trying to use a testnet mask on mainnet, or vice versa.`
      })
    }

    // Query the Insight API.
    let retData: MaskDetailsInterface = await detailsFromInsight(
      mask,
      currentPage
    )

    // Return the retrieved mask information.
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
    //logger.error(`Error in mask.ts/detailsSingle: `, err)
    wlogger.error(`Error in mask.ts/detailsSingle().`, err)

    res.status(500)
    return res.json({ error: util.inspect(err) })
  }
}

// POST handler for bulk queries on mask details
async function detailsBulk(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): Promise<express.Response> {
  try {
    let masks: string[] = req.body.masks
    const currentPage: number = req.body.page ? parseInt(req.body.page, 10) : 0

    // Reject if masks is not an array.
    if (!Array.isArray(masks)) {
      res.status(400)
      return res.json({
        error: "masks needs to be an array. Use GET for single masks."
      })
    }

    // Enforce array size rate limits
    if (!routeUtils.validateArraySize(req, masks)) {
      res.status(429) //
      return res.json({
        error: `Array too large.`
      })
    }

    logger.debug(`Executing masks/details with these masks: `, masks)
    wlogger.debug(`Executing masks/details with these masks: `, masks)

    // Validate each element in the masks array.
    for (let i: number = 0; i < masks.length; i++) {
      const thisAddress: string = masks[i]
      // Ensure the input is a valid BCH masks.
      try {
        bitbox.Address.toLegacyAddress(thisAddress)
      } catch (err) {
        res.status(400)
        return res.json({
          error: `Invalid BCH masks. Double check your masks is valid: ${thisAddress}`
        })
      }

      // Prevent a common user error. Ensure they are using the correct network masks.
      const networkIsValid: boolean = routeUtils.validateNetwork(
        Utils.toCashAddress(thisAddress)
      )
      if (!networkIsValid) {
        res.status(400)
        return res.json({
          error: `Invalid network for masks ${thisAddress}. Trying to use a testnet masks on mainnet, or vice versa.`
        })
      }
    }

    // Loops through each masks and creates an array of Promises, querying
    // Insight API in parallel.
    let masksPromises: Promise<MaskDetailsInterface>[] = masks.map(
      async (masks: any): Promise<MaskDetailsInterface> => {
        return detailsFromInsight(masks, currentPage)
      }
    )

    // Wait for all parallel Insight requests to return.
    let result: MaskDetailsInterface[] = await Promise.all(masksPromises)

    // Return the array of retrieved masks information.
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
    wlogger.error(`Error in masks.ts/detailsBulk().`, err)

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
