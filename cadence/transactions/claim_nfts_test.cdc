import NonFungibleToken from 0xNONFUNGIBLETOKEN
import DayNFT from 0xDAYNFTCONTRACTADDRESS
import FlowToken from 0xFLOWTOKEN

transaction(today_arr: [Int]) {

    let address: Address

    prepare(signer: AuthAccount) {
        if (signer.getCapability(DayNFT.CollectionPublicPath)
            .borrow<&DayNFT.Collection{NonFungibleToken.CollectionPublic}>() == nil) {
            // Create a Collection resource and save it to storage
            let collection <- DayNFT.createEmptyCollection()
            signer.save(<-collection, to: DayNFT.CollectionStoragePath)

            // create a public capability for the collection
            signer.link<&DayNFT.Collection{NonFungibleToken.CollectionPublic}>(
                DayNFT.CollectionPublicPath,
                target: DayNFT.CollectionStoragePath
            )
        }
        self.address = signer.address     
    }

    execute { 
        let today = DayNFT.Date(day: today_arr[0], month: today_arr[1], year: today_arr[2])
        DayNFT.claimNFTsWithToday(address: self.address, today: today)
    }
}
 