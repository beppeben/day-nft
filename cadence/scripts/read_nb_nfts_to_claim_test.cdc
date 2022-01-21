import DayNFT from 0xDAYNFTCONTRACTADDRESS

pub fun main(address: Address, today_arr: [Int]): Int {
    let today = DayNFT.Date(day: today_arr[0], month: today_arr[1], year: today_arr[2])
    return DayNFT.nbNFTsToClaimWithToday(address: address, today: today)
}