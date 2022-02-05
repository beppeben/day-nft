import DateUtils from 0xDATEUTILSCONTRACTADDRESS

pub fun main(timestamp: UInt64): DateUtils.Date {
    return DateUtils.getDateFromTimestamp(timestamp)
}