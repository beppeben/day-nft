// Implementation of the DayNFT contract

import NonFungibleToken from "./NonFungibleToken.cdc"
import MetadataViews from "./MetadataViews.cdc"
import DateUtils from "./DateUtils.cdc"
import FungibleToken from 0x9a0766d93b6608b7
import FlowToken from 0x7e60df042a9c0868

pub contract DayNFT: NonFungibleToken {

    // Named Paths
    pub let CollectionStoragePath: StoragePath
    pub let CollectionPublicPath: PublicPath
    pub let AdminPublicPath: PublicPath

    // Total supply of NFTs in existence
    pub var totalSupply: UInt64

    // NFTs that can be claimed by users that won previous days' auction(s)
    pub var NFTsDue: @{Address: [NFT]}

    // Amounts of Flow available to be redistributed to each NFT holder
    pub var amountsDue: {UInt64: UFix64}
    
    // Percentage of any amount of Flow deposited to this contract that gets 
    // redistributed to NFT holders
    pub let percentageDistributed: UFix64

    // Vault to be used for flow redistribution
    access(contract) let distributeVault: @FlowToken.Vault

    // Best bid of the day for minting today's NFT
    access(contract) var bestBid: @Bid

    // NFT minter
    access(contract) let minter: @NFTMinter

    // Event emitted when the contract is initialized
    pub event ContractInitialized()

    // Event emitted when users withdraw from their NFT collection
    pub event Withdraw(id: UInt64, from: Address?)

    // Event emitted when users deposit into their NFT collection
    pub event Deposit(id: UInt64, to: Address?)

    // Event emitted when a new NFT is minted
    pub event Minted(id: UInt64, date: String, title: String)

    // Event emitted when a user makes a bid
    pub event BidReceived(user: Address, date: DateUtils.Date, title: String)


    // Standard NFT resource
    pub resource NFT: NonFungibleToken.INFT {
        pub let id: UInt64
        pub let name: String
        pub let description: String
        pub let thumbnail: String

        pub let title: String
        pub let date: DateUtils.Date
        pub let dateStr: String

        init(initID: UInt64, date: DateUtils.Date, title: String) {
            self.dateStr = date.toString()

            self.id = initID
            self.name = "DAY-NFT #".concat(self.dateStr)
            self.description = "Minted on day-nft.io on ".concat(self.dateStr)
            self.thumbnail = "https://day-nft.io/imgs/".concat(initID.toString()).concat(".png")

            self.title = title
            self.date = date

            emit Minted(id: initID, date: date.toString(), title: title)
        }

        pub fun getViews(): [Type] {
            return [
                Type<MetadataViews.Display>()
            ]
        }

        pub fun resolveView(_ view: Type): AnyStruct? {
            switch view {
                case Type<MetadataViews.Display>():
                    return MetadataViews.Display(
                        name: self.name,
                        description: self.description,
                        thumbnail: MetadataViews.HTTPFile(
                            url: self.thumbnail
                        )
                    )
            }

            return nil
        }
    }

    // This is the interface that users can cast their DayNFT Collection as
    // to allow others to deposit DayNFT into their Collection. It also allows for reading
    // the details of a DayNFT in the Collection.
    pub resource interface CollectionPublic {
        pub fun deposit(token: @NonFungibleToken.NFT)
        pub fun getIDs(): [UInt64]
        pub fun borrowNFT(id: UInt64): &NonFungibleToken.NFT
        pub fun borrowDayNFT(id: UInt64): &DayNFT.NFT? {
            // If the result isn't nil, the id of the returned reference
            // should be the same as the argument to the function
            post {
                (result == nil) || (result?.id == id):
                    "Cannot borrow DayNFT reference: The ID of the returned reference is incorrect"
            }
        }
    }

    // Collection of NFTs implementing standard interfaces
    pub resource Collection: CollectionPublic, NonFungibleToken.Provider, NonFungibleToken.Receiver, NonFungibleToken.CollectionPublic {
        // dictionary of NFT conforming tokens
        // NFT is a resource type with an `UInt64` ID field
        pub var ownedNFTs: @{UInt64: NonFungibleToken.NFT}

        init () {
            self.ownedNFTs <- {}
        }

        // withdraw removes an NFT from the collection and moves it to the caller
        pub fun withdraw(withdrawID: UInt64): @NonFungibleToken.NFT {
            let token <- self.ownedNFTs.remove(key: withdrawID) ?? panic("missing NFT")

            emit Withdraw(id: token.id, from: self.owner?.address)

            return <-token
        }

        // deposit takes a NFT and adds it to the collections dictionary
        // and adds the ID to the id array
        pub fun deposit(token: @NonFungibleToken.NFT) {
            let token <- token as! @DayNFT.NFT

            let id: UInt64 = token.id

            // add the new token to the dictionary which removes the old one
            let oldToken <- self.ownedNFTs[id] <- token

            emit Deposit(id: id, to: self.owner?.address)

            destroy oldToken
        }

        // getIDs returns an array of the IDs that are in the collection
        pub fun getIDs(): [UInt64] {
            return self.ownedNFTs.keys
        }

        // borrowNFT gets a reference to an NFT in the collection
        // so that the caller can read its metadata and call its methods
        pub fun borrowNFT(id: UInt64): &NonFungibleToken.NFT {
            return &self.ownedNFTs[id] as &NonFungibleToken.NFT
        }

        // Gets a reference to an NFT in the collection as a DayNFT,
        // exposing all of its fields.
        pub fun borrowDayNFT(id: UInt64): &DayNFT.NFT? {
            if self.ownedNFTs[id] != nil {
                let ref = &self.ownedNFTs[id] as auth &NonFungibleToken.NFT
                return ref as! &DayNFT.NFT
            } else {
                return nil
            }
        }

        destroy() {
            destroy self.ownedNFTs
        }
    }

    // Resource that the contract owns to create new NFTs
    pub resource NFTMinter {

        // mintNFT mints a new NFT with a new ID
        // and deposit it in the recipients collection using their collection reference
        pub fun mintNFT(date: DateUtils.Date, title: String) : @NFT {

            // create a new NFT
            let id = DayNFT.totalSupply
            var newNFT <- create NFT(initID: id, date: date, title: title)

            DayNFT.totalSupply = DayNFT.totalSupply + 1
            DayNFT.amountsDue[id] = 0.0

            return <-newNFT
        }
    }

    // Resource containing a user's bid in the auction for today's NFT
    pub resource Bid {
        pub(set) var vault: @FlowToken.Vault
        pub let recipient: Address
        pub let title: String
        pub let date: DateUtils.Date

        init(vault: @FlowToken.Vault, 
              recipient: Address,
              title: String,
              date: DateUtils.Date) {
            self.vault <- vault
            self.recipient = recipient
            self.title = title
            self.date = date
        }

        destroy() {
            destroy self.vault
        }
    }

    // PUBLIC APIs //

    // Create an empty NFT collection
    pub fun createEmptyCollection(): @NonFungibleToken.Collection {
        return <- create Collection()
    }

    // Make a bid on today's NFT
    pub fun makeBid(vault: @FlowToken.Vault, 
                    recipient: Address,
                    title: String,
                    date: DateUtils.Date) {
        
        let today = DateUtils.getDate()
        self.makeBidWithToday(vault: <-vault, 
                              recipient: recipient,
                              title: title,
                              date: date,
                              today: today)
    }
    // ONLY FOR TESTING, THIS MUST BE PRIVATE WHEN DEPLOYED
    pub fun makeBidWithToday(vault: @FlowToken.Vault, 
                              recipient: Address,
                              title: String,
                              date: DateUtils.Date,
                              today: DateUtils.Date) {
                      
        if (!date.equals(today)) {
          panic("You can only bid on today's NFT")
        }
        if (vault.balance == 0.0) {
          panic("You can only bid a positive amount")
        }
        if (title.length > 70) {
          panic("The title can only be 70 characters long at most")
        }
        
        var bid <- create Bid(vault: <-vault, 
                      recipient: recipient,
                      title: title,
                      date: date)
        
        if(self.bestBid.date.equals(today) || self.bestBid.vault.balance == 0.0) {
            if(bid.vault.balance > self.bestBid.vault.balance) {
                if(self.bestBid.vault.balance > 0.0) {
                    // refund current best bid and replace it with the new one
                    let rec = getAccount(self.bestBid.recipient).getCapability(/public/flowTokenReceiver)
                                .borrow<&FlowToken.Vault{FungibleToken.Receiver}>()
                                ?? panic("Could not borrow a reference to the receiver")
                    var tempVault <- FlowToken.createEmptyVault() as! @FlowToken.Vault
                    tempVault <-> self.bestBid.vault
                    rec.deposit(from: <- tempVault)
                }
                bid <-> self.bestBid
                destroy bid
            } else {
                // refund the new bid
                let rec = getAccount(bid.recipient).getCapability(/public/flowTokenReceiver)
                            .borrow<&FlowToken.Vault{FungibleToken.Receiver}>()
                            ?? panic("Could not borrow a reference to the receiver")
                var tempVault <- FlowToken.createEmptyVault() as! @FlowToken.Vault
                tempVault <-> bid.vault
                rec.deposit(from: <- tempVault)
                destroy bid
            }
        } else {
            // this is the first bid of the day
            // assign NFT to best bid and replace it with new bid
            if(self.bestBid.vault.balance > 0.0) {
                // deposit flow to contract account
                var tempVault <- FlowToken.createEmptyVault() as! @FlowToken.Vault
                tempVault <-> self.bestBid.vault
                self.deposit(vault: <- tempVault)

                // mint the NFT
                let newNFT <- self.minter.mintNFT(date: self.bestBid.date, title: self.bestBid.title)
                // record into due NFTs
                if(self.NFTsDue[self.bestBid.recipient] == nil) {
                    let newArray <- [<-newNFT]
                    self.NFTsDue[self.bestBid.recipient] <-! newArray
                } else {
                  var newArray: @[NFT] <- []
                  var a = 0
                  var len = self.NFTsDue[self.bestBid.recipient]?.length!
                  while a < len {
                      let nft <- self.NFTsDue[self.bestBid.recipient]?.removeFirst()!
                      newArray.append(<-nft)
                      a = a + 1
                  }
                  newArray.append(<-newNFT)
                  let old <- self.NFTsDue.remove(key: self.bestBid.recipient)
                  destroy old
                  self.NFTsDue[self.bestBid.recipient] <-! newArray
                }

                // replace bid
                self.bestBid <-> bid
                destroy bid
            }
        }
        emit BidReceived(user: recipient, date: date, title: title)
    }

    pub struct PublicBid {
        pub let amount: UFix64
        pub let user: Address
        pub let date: DateUtils.Date

        init(amount: UFix64, 
              user: Address,
              date: DateUtils.Date) {
            self.amount = amount
            self.user = user
            self.date = date
        }
    }

    // Get the best bid for today's auction
    pub fun getBestBid(): PublicBid {
        var today = DateUtils.getDate()
        return self.getBestBidWithToday(today: today)
    }
    // ONLY FOR TESTING, THIS MUST BE PRIVATE WHEN DEPLOYED
    pub fun getBestBidWithToday(today: DateUtils.Date): PublicBid {
        if (today.equals(self.bestBid.date)) {
            return PublicBid(amount: self.bestBid.vault.balance,
                                user: self.bestBid.recipient,
                                date: today)
        } else {
            return PublicBid(amount: 0.0,
                                user: Address(0x0),
                                date: today)
        }
    }

    // Verify if a user has any NFTs to claim after winning one or more auctions
    pub fun nbNFTsToClaim(address: Address): Int {
        let today = DateUtils.getDate()
        return self.nbNFTsToClaimWithToday(address: address, today: today)
    }
    // ONLY FOR TESTING, THIS MUST BE PRIVATE WHEN DEPLOYED
    pub fun nbNFTsToClaimWithToday(address: Address, today: DateUtils.Date): Int {
        var res = 0
        if(self.NFTsDue[address] != nil) {
            res = self.NFTsDue[address]?.length!
        }
        if(!self.bestBid.date.equals(today) && self.bestBid.recipient == address) {
            res = res + 1
        }
        return res
    }

    // Claim NFTs due to the user, and deposit them into their collection
    pub fun claimNFTs(address: Address): Int {
        var today = DateUtils.getDate()
        return self.claimNFTsWithToday(address: address, today: today)
    }
    // ONLY FOR TESTING, THIS MUST BE PRIVATE WHEN DEPLOYED
    pub fun claimNFTsWithToday(address: Address, today: DateUtils.Date): Int {
        var res = 0
        let receiver = getAccount(address)
          .getCapability(self.CollectionPublicPath)
          .borrow<&{DayNFT.CollectionPublic}>()
          ?? panic("Could not get receiver reference to the NFT Collection")

        if(self.NFTsDue[address] != nil) {
            var a = 0
            let len = self.NFTsDue[address]?.length!
            while a < len {
                let nft <- self.NFTsDue[self.bestBid.recipient]?.removeFirst()!
                receiver.deposit(token: <-nft)
                a = a + 1
            }
            res = len
        }
        if(!self.bestBid.date.equals(today) && self.bestBid.recipient == address) {
            // deposit flow to contract account
            var tempVault <- FlowToken.createEmptyVault() as! @FlowToken.Vault
            tempVault <-> self.bestBid.vault
            self.deposit(vault: <- tempVault)

            // mint the NFT and send it
            let newNFT <- self.minter.mintNFT(date: self.bestBid.date, title: self.bestBid.title)
            receiver.deposit(token: <-newNFT)
            
            // replace old best bid with a default one for today
            let vault <- FlowToken.createEmptyVault() as! @FlowToken.Vault 
            var bid <- create Bid(vault: <- vault, 
                  recipient: Address(0x0),
                  title: "",
                  date: today)
            self.bestBid <-> bid
            destroy bid
            res = res + 1
        }
        return res
    }

    // Get amount of Flow due to the user
    pub fun tokensToClaim(address: Address): UFix64 {
        // borrow the recipient's public NFT collection reference
        let holder = getAccount(address)
                      .getCapability(self.CollectionPublicPath)
                      .borrow<&DayNFT.Collection{DayNFT.CollectionPublic}>()
                      ?? panic("Could not get receiver reference to the NFT Collection")

        // compute amount due based on number of NFTs detained
        var amountDue = 0.0
        for id in holder.getIDs() {
            amountDue = amountDue + self.amountsDue[id]!
        }
        return amountDue
    }

    // Claim Flow due to the user
    pub fun claimTokens(address: Address): UFix64 {
        // borrow the recipient's public NFT collection reference
        let holder = getAccount(address)
                      .getCapability(self.CollectionPublicPath)
                      .borrow<&DayNFT.Collection{DayNFT.CollectionPublic}>()
                      ?? panic("Could not get receiver reference to the NFT Collection")

        // borrow the recipient's flow token receiver
        let receiver = getAccount(address).getCapability(/public/flowTokenReceiver)
                        .borrow<&FlowToken.Vault{FungibleToken.Receiver}>()
                        ?? panic("Could not borrow a reference to the receiver")

        // compute amount due based on number of NFTs detained
        var amountDue = 0.0
        for id in holder.getIDs() {
            amountDue = amountDue + self.amountsDue[id]!
            self.amountsDue[id] = 0.0
        }

        // pay amount
        //let mainVault = self.account.borrow<&FlowToken.Vault>(from: /storage/flowTokenVault)
        //            ?? panic("Could not borrow a reference to the flow vault")
        let vault <- self.distributeVault.withdraw(amount: amountDue)
        receiver.deposit(from: <- vault)

        return amountDue
    }

    pub fun max(_ a: UFix64, _ b: UFix64): UFix64 {
        var res = a
        if (b > a){
            res = b
        }
        return res
    }
    
    // Deposit Flow into the contract, to be redistributed among NFT holders
    pub fun deposit(vault: @FungibleToken.Vault) {
        // deposit flow to contract account
        let rec = self.account.getCapability(/public/flowTokenReceiver)
                    .borrow<&FlowToken.Vault{FungibleToken.Receiver}>()
                    ?? panic("Could not borrow a reference to the receiver")
        let amount = vault.balance
        var distribute = amount * self.percentageDistributed
        if (self.totalSupply == 0) {
            distribute = 0.0
        }
        let distrVault <- vault.withdraw(amount: distribute)
        self.distributeVault.deposit(from: <- distrVault)
        rec.deposit(from: <- vault)

        // assign part of the value to the current holders
        let id = self.totalSupply
        let distributeEach = distribute / self.max(UFix64(id), 1.0)
        var a = 0 as UInt64
        while a < id {
            self.amountsDue[a] = self.amountsDue[a]! + distributeEach
            a = a + 1
        }
    }

    // Resource to receive Flow tokens to be distributed
    pub resource Admin: FungibleToken.Receiver {
        pub fun deposit(from: @FungibleToken.Vault) {
            DayNFT.deposit(vault: <-from)
        }
    }

    init() {

        // Set named paths
        //FIXME: REMOVE SUFFIX BEFORE RELEASE
        self.CollectionStoragePath = /storage/DayNFTCollection007
        self.CollectionPublicPath = /public/DayNFTCollection007
        self.AdminPublicPath = /public/DayNFTAdmin007
        let adminStoragePath = /storage/DayNFTAdmin007

        let admin <- create Admin()
        self.account.save(<-admin, to: adminStoragePath)
        // Create a public capability allowing external users (like marketplaces)
        // to deposit flow to the contract
        self.account.link<&DayNFT.Admin{FungibleToken.Receiver}>(
            self.AdminPublicPath,
            target: adminStoragePath
        )

        self.totalSupply = 0
        self.amountsDue = {}
        self.NFTsDue <- {}

        self.percentageDistributed = 0.5
        self.distributeVault <- FlowToken.createEmptyVault() as! @FlowToken.Vault  
        
        // initialize dummy best bid
        let vault <- FlowToken.createEmptyVault() as! @FlowToken.Vault        
        let date = DateUtils.Date(day: 1, month: 1, year: 2020) 
        self.bestBid <- create Bid(vault: <- vault, 
                      recipient: Address(0x0),
                      title: "",
                      date: date)

        // Create a Minter resource and keep it in the contract
        self.minter <- create NFTMinter()

        emit ContractInitialized()
    }
}