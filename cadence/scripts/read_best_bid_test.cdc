import DayNFT from 0xDAYNFTCONTRACTADDRESS

pub fun main(today_arr: [Int]): UFix64 {
    let today = DayNFT.Date(day: today_arr[0], month: today_arr[1], year: today_arr[2])
    return DayNFT.getBestBidWithToday(today: today)
}
