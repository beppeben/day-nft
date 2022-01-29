// Implementation of the DayNFT contract

import NonFungibleToken from "./NonFungibleToken.cdc"
import MetadataViews from "./MetadataViews.cdc"
import FungibleToken from 0x9a0766d93b6608b7
import FlowToken from 0x7e60df042a9c0868

pub contract DayNFT: NonFungibleToken {

    // Named Paths
    pub let CollectionStoragePath: StoragePath
    pub let CollectionPublicPath: PublicPath

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
    pub event BidReceived(user: Address, date: Date, title: String)


    // Standard NFT resource
    pub resource NFT: NonFungibleToken.INFT {
        pub let id: UInt64
        pub let name: String
        pub let description: String
        pub let thumbnail: String

        pub let title: String
        pub let date: Date

        init(initID: UInt64, date: Date, title: String) {
            let dateStr = date.toString()

            self.id = initID
            self.name = "DAY-NFT #".concat(dateStr)
            self.description = "Minted on day-nft.io on ".concat(dateStr)
            self.thumbnail = "https://day-nft.io/imgs/".concat(dateStr).concat(".png")

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

    // Collection of NFTs implementing standard interfaces
    pub resource Collection: NonFungibleToken.Provider, NonFungibleToken.Receiver, NonFungibleToken.CollectionPublic {
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

        destroy() {
            destroy self.ownedNFTs
        }
    }

    // Resource that the contract owns to create new NFTs
    pub resource NFTMinter {

        // mintNFT mints a new NFT with a new ID
        // and deposit it in the recipients collection using their collection reference
        pub fun mintNFT(date: Date, title: String) : @NFT {

            // create a new NFT
            let id = DayNFT.totalSupply
            var newNFT <- create NFT(initID: id, date: date, title: title)

            DayNFT.totalSupply = DayNFT.totalSupply + 1
            DayNFT.amountsDue[id] = 0.0

            return <-newNFT
        }
    }

    // A simple Date object
    pub struct Date {
        pub let day: Int
        pub let month: Int
        pub let year: Int

        init(day: Int, month: Int, year: Int) {
            self.day = day
            self.month = month
            self.year = year
        }

        pub fun toTwoDigitString(_ num: Int): String {
            let raw = ("0".concat(num.toString()))
            let formattedNumber = raw.slice(from: raw.length - 2, upTo: raw.length)
            return formattedNumber
        }

        pub fun toString(): String {
            return self.toTwoDigitString(self.day).concat("-").concat(self.toTwoDigitString(self.month)
                    .concat("-").concat(self.year.toString()))
        }

        pub fun equals(_ other: Date): Bool {
            return self.day == other.day && self.month == other.month && self.year == other.year
        }
    }

    // Function to get today's date from the block's timestamp
    pub fun getDate(): Date {
        let timestamp = UInt64(getCurrentBlock().timestamp)
        return self.getDateFromTimestamp(timestamp)
    }

    // Function to get a date a timestamp
    pub fun getDateFromTimestamp(_ timestamp: UInt64): Date {
        let SECONDS_PER_DAY = 86400 as UInt64
        let INITIAL_TIMESTAMP = 1609459200 as UInt64
        let EPOCH_MONTH = 1
        let EPOCH_YEAR = 2021
        var days = Int((timestamp - INITIAL_TIMESTAMP) / SECONDS_PER_DAY)

        var year = EPOCH_YEAR;
        while (days >= self.daysForYear(year)) {
            days = days - self.daysForYear(year)
            year = year + 1
        }

        let daysPerMonth = self.daysPerMonth(year)
        var month = EPOCH_MONTH
        while (days >= daysPerMonth[month]) {
            days = days - daysPerMonth[month]
            month = month + 1
        }

        let day = days + 1
        return Date(day: day, month: month, year: year)
    }

    // Auxiliary functions needed to get dates out of timestamps
    access(contract) fun isLeapYear(_ year: Int): Bool {
        return year % 400 == 0 || (year % 4 == 0 && year % 100 != 0)
    }
    access(contract) fun daysForYear(_ year: Int) : Int {
        return self.isLeapYear(year) ? 366 : 365;
    }
    access(contract) fun daysPerMonth(_ year: Int) : [Int] {
        return [0, 31, self.isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    }

    // Resource containing a user's bid in the auction for today's NFT
    pub resource Bid {
        pub(set) var vault: @FlowToken.Vault
        pub let recipient: Address
        pub let title: String
        pub let date: Date

        init(vault: @FlowToken.Vault, 
              recipient: Address,
              title: String,
              date: Date) {
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
                    date: Date) {
        
        let today = self.getDate()
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
                              date: Date,
                              today: Date) {
                      
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
                tempVault <-> self.bestBid.vault
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
        pub let date: Date

        init(amount: UFix64, 
              user: Address,
              date: Date) {
            self.amount = amount
            self.user = user
            self.date = date
        }
    }

    // Get the best bid for today's auction
    pub fun getBestBid(): PublicBid {
        var today = self.getDate()
        return self.getBestBidWithToday(today: today)
    }
    // ONLY FOR TESTING, THIS MUST BE PRIVATE WHEN DEPLOYED
    pub fun getBestBidWithToday(today: Date): PublicBid {
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
        let today = self.getDate()
        return self.nbNFTsToClaimWithToday(address: address, today: today)
    }
    // ONLY FOR TESTING, THIS MUST BE PRIVATE WHEN DEPLOYED
    pub fun nbNFTsToClaimWithToday(address: Address, today: Date): Int {
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
        var today = self.getDate()
        return self.claimNFTsWithToday(address: address, today: today)
    }
    // ONLY FOR TESTING, THIS MUST BE PRIVATE WHEN DEPLOYED
    pub fun claimNFTsWithToday(address: Address, today: Date): Int {
        var res = 0
        let receiver = getAccount(address)
          .getCapability(self.CollectionPublicPath)
          .borrow<&{NonFungibleToken.CollectionPublic}>()
          ?? panic("Could not get receiver reference to the NFT Collection")

        if(self.NFTsDue[address] != nil) {
            var a = 0
            var len = self.NFTsDue[address]?.length!
            while a < len {
                let nft <- self.NFTsDue[self.bestBid.recipient]?.removeFirst()!
                receiver.deposit(token: <-nft)
                a = a + 1
            }
            res = self.NFTsDue[address]?.length!
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
                  recipient: self.account.address,
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
                      .borrow<&DayNFT.Collection{NonFungibleToken.CollectionPublic}>()
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
                      .borrow<&DayNFT.Collection{NonFungibleToken.CollectionPublic}>()
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
        let distribute = amount * self.percentageDistributed
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

    init() {

        // Set named paths
        //FIXME: REMOVE SUFFIX BEFORE RELEASE
        self.CollectionStoragePath = /storage/DayNFTCollection003
        self.CollectionPublicPath = /public/DayNFTCollection003

        self.totalSupply = 0
        self.amountsDue = {}
        self.NFTsDue <- {}

        self.percentageDistributed = 0.5
        self.distributeVault <- FlowToken.createEmptyVault() as! @FlowToken.Vault  
        
        // initialize dummy best bid
        let vault <- FlowToken.createEmptyVault() as! @FlowToken.Vault        
        let date = Date(day: 1, month: 1, year: 2020) 
        self.bestBid <- create Bid(vault: <- vault, 
                      recipient: Address(0x0),
                      title: "",
                      date: date)

        // Create a Minter resource and keep it in the contract
        self.minter <- create NFTMinter()

        emit ContractInitialized()
    }
}