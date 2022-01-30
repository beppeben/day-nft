import DayNFT from 0xDAYNFTCONTRACTADDRESS
import FlowToken from 0xFLOWTOKEN
import FungibleToken from 0xFUNGIBLETOKEN

transaction(amount: UFix64, account: Address) {

    let vault: @FlowToken.Vault

    prepare(signer: AuthAccount) {
        let mainVault = signer.borrow<&FlowToken.Vault>(from: /storage/flowTokenVault)
                    ?? panic("Could not borrow a reference to the flow vault")
        self.vault <- mainVault.withdraw(amount: amount) as! @FlowToken.Vault   
    }

    execute {

        let rec = getAccount(account).getCapability(DayNFT.AdminPublicPath)
                  .borrow<&DayNFT.Admin{FungibleToken.Receiver}>()
                  ?? panic("Could not borrow a reference to the receiver") 

        rec.deposit(from: <-self.vault)
    }
}
 