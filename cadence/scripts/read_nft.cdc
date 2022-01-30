import NonFungibleToken from 0xNONFUNGIBLETOKEN
import DayNFT from 0xDAYNFTCONTRACTADDRESS

// This script reads metadata about an NFT in a user's collection
pub fun main(account: Address, id: UInt64): &DayNFT.NFT? {

    // Get the public collection of the owner of the token
    let collectionRef = getAccount(account)
        .getCapability(DayNFT.CollectionPublicPath)
        .borrow<&DayNFT.Collection{DayNFT.CollectionPublic}>()
        ?? panic("Could not borrow capability from public collection")

    // Borrow a reference to a specific NFT in the collection
    let nft = collectionRef.borrowDayNFT(id: id)

    return nft
}