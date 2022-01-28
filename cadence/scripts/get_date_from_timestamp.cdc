import DayNFT from 0xDAYNFTCONTRACTADDRESS

pub fun main(timestamp: UInt64): DayNFT.Date {
    return DayNFT.getDateFromTimestamp(timestamp)
}