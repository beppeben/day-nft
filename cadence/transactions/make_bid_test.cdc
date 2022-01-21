import NonFungibleToken from 0xNONFUNGIBLETOKEN
import DayNFT from 0xDAYNFTCONTRACTADDRESS
import FlowToken from 0xFLOWTOKEN

transaction(bidAmount: UFix64, title: String, date_arr: [Int], today_arr: [Int]) {

    let vault: @FlowToken.Vault
    let address: Address

    prepare(signer: AuthAccount) {
        let mainVault = signer.borrow<&FlowToken.Vault>(from: /storage/flowTokenVault)
                    ?? panic("Could not borrow a reference to the flow vault")
        self.vault <- mainVault.withdraw(amount: bidAmount) as! @FlowToken.Vault
        self.address = signer.address     
    }

    execute { 

        let date = DayNFT.Date(day: date_arr[0], month: date_arr[1], year: date_arr[2])
        let today = DayNFT.Date(day: today_arr[0], month: today_arr[1], year: today_arr[2])
        
        DayNFT.makeBidWithToday(vault: <-self.vault, 
                                recipient: self.address,
                                title: title,
                                date: date,
                                today: today)
    }
}
 