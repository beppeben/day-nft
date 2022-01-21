import NonFungibleToken from 0xNONFUNGIBLETOKEN
import DayNFT from 0xDAYNFTCONTRACTADDRESS

pub fun main(account: Address): [UInt64] {
    let collectionRef = getAccount(account)
        .getCapability(DayNFT.CollectionPublicPath)
        .borrow<&DayNFT.Collection{NonFungibleToken.CollectionPublic}>()
        ?? panic("Could not get reference to the NFT Collection")

    return collectionRef.getIDs()
}
