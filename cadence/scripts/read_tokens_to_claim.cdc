import DayNFT from 0xDAYNFTCONTRACTADDRESS

pub fun main(address: Address): UFix64 {
    return DayNFT.tokensToClaim(address: address)
}