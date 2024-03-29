const request = require("request");
const ws = require("ws");
const fs = require("fs");

class Utopia {

    /**
     * Utopia API for Node.js
     * @param {string} token Your API token
     * @param {string} apiHost IP with API
     * @param {string} apiPort Port with API
     * @param {string} wsPort WebSocket API port
     */

    constructor(token, apiHost, apiPort, wsPort) {
        this.listenedEvents = {
            "newOutgoingChannelMessage": [],
            "newChannelMessage": [],
            "newOutgoingInstantMessage": [],
            "newInstantMessage": [],
            "channelJoinChanged": [],
            "newPaymentTransfer": [],
            "newEmail": [],
            "any": []
        };
        this.token = token || "no_token";
        if (this.token == "no_token") {
            throw new Error("token is not valid");
        }
        if (!this.token.toLowerCase().match(/^[a-f0-9]+$/)) {
            throw new Error("token is not valid");
        }
        this.token = token.toUpperCase();
        this.apiHost = apiHost || "127.0.0.1";
        this.apiPort = apiPort || "20000";
        this.webSocketUnavailable = false;
        this.getWebSocketState().then((data) => {
            if (data.result !== 0) {
                this.wsPort = data.result.toString();
                this.webSocketUnavailable = false;
                this.webSocket = new ws(`ws://${this.apiHost}:${this.wsPort}/UtopiaWSS?token=${this.token}`);
                this.webSocket.on("message", (data) => {
                    var parsed = JSON.parse(data);
                    for (var cb in this.listenedEvents[parsed.type]) {
                        this.listenedEvents[parsed.type][cb](parsed);
                    }
                    for(var cb in this.listenedEvents["any"]){
                        this.listenedEvents[parsed.type][cb](parsed);
                    }
                });
            } else {
                this.wsPort = wsPort || "20001";
                this.setWebSocketState(true, this.wsPort).then((data) => {
                    this.webSocketUnavailable = false;
                    this.webSocket = new ws(`ws://${this.apiHost}:${this.wsPort}/UtopiaWSS?token=${this.token}`);
                    this.webSocket.on("message", (data) => {
                        var parsed = JSON.parse(data);
                        for (var cb in this.listenedEvents[parsed.type]) {
                            this.listenedEvents[parsed.type][cb](parsed);
                        }
                        for(var cb in this.listenedEvents["any"]){
                            this.listenedEvents[parsed.type][cb](parsed);
                        }
                    });
                }, (error) => {
                    console.warn("Couldn't set Websocket state, .on is disabled");
                    this.webSocketUnavailable = true;
                });
            }
        }, (error) => {
            console.warn("Couldn't get Websocket state, activating anyway");
            this.wsPort = wsPort || 20001;
            this.setWebSocketState(true, this.wsPort).then((data) => {
                this.webSocketUnavailable = false;
                this.webSocket = new ws(`ws://${this.apiHost}:${this.wsPort}/UtopiaWSS?token=${this.token}`);
                this.webSocket.on("message", (data) => {
                    for (var cb in this.listenedEvents[parsed.type]) {
                        this.listenedEvents[parsed.type][cb](parsed);
                    }
                    for(var cb in this.listenedEvents["any"]){
                        this.listenedEvents[parsed.type][cb](parsed);
                    }
                });
            }, (error) => {
                console.warn("Couldn't set Websocket state, .on is disabled");
                this.webSocketUnavailable = true;
            });
        });
    }

    /**
     * Send a raw request to API server
     * @param {string} method API method
     * @param {object} params Request parameters
     * @returns {Promise<object>} Promise
     */

    sendRequest(method, params) {
        var __ = {
            "token": this.token,
            "method": "",
            "params": {}
        };
        __.method = method || "getSystemInfo";
        __.params = params || {};

        return new Promise((resolve, reject) => {
            request.post({
                url: `http://${this.apiHost}:${this.apiPort}/api/1.0`,
                json: true,
                body: __
            }, function (error_, response, body) {
                if (!error_ && response.statusCode == 200) {
                    resolve(body);
                } else {
                    var e = error_ || "statusCode is not 200";
                    reject(e);
                }
            });
        });
    }

    /**
     * Event listener
     * @param {"newOutgoingChannelMessage"|"newChannelMessage"|"newOutgoingInstantMessage"|"newInstantMessage"|"channelJoinChanged"|"newPaymentTransfer"|"newEmail"|"any"} event Event type
     * @param {function} callback 
     */

    on(event, callback) {
        if (this.webSocketUnavailable) { return; }
        this.listenedEvents[event]?this.listenedEvents[event].push(callback):false;
    }

    /**
     * Method getSystemInfo returns information about current packaging version of the Utopia application in the Response block. The method is called without using any parameters.
     * @returns {Promise<string>} Promise
     */

    getSystemInfo() {
        return this.sendRequest();
    }

    /**
     * Method getProfileStatus returns the profile status.
     * @returns {Promise<string>} Promise
     */

    getProfileStatus() {
        return this.sendRequest("getProfileStatus");
    }

    /**
     * Method setProfileStatus sets the new status, as well as the mood message in the Utopia Ecosystem. The method is called by using Status parameter line with possible options: (Available, Away, DoNotDisturb, Invisible, Offline) and if desired Mood which contains mood message text (up to 130 symbols). In the Response field, the status of completed operation is displayed.
     * @param {string} status Available | Away | DoNotDisturb | Invisible | Offline
     * @param {string} mood Mood, visible to any contact
     * @returns {Promise<string>} Promise
     */

    setProfileStatus(status, mood) {
        return this.sendRequest("setProfileStatus", { "status": status, "mood": mood });
    }

    /**
     * Method getOwnContact returns information about yourself.
     * @returns {Promise<string>} Promise
     */

    getOwnContact() {
        return this.sendRequest("getOwnContact");
    }

    /**
     * Method getContacts returns to the Response field the list of contacts, it is possible to search by full or partial matching of the Public Key and Nickname. As a parameter it is possible to specify Filter that transfers the text line to search for contacts ( has to contain full or partial matching with Public Key or Nickname of the searched contact).The Filter "#owner#" will return information about yourself.
     * @param {string} filter String, filtering result
     * @returns {Promise<string>} Promise
     */

    getContacts(filter) {
        filter = filter || "";
        return this.sendRequest("getContacts", { "filter": filter });
    }

    /**
     * Method getContactAvatar returns to the Response field the avatar of the selected user in the base64 or hex format.As a parameter the method uses Public Key of the contact.Format is JPG / PNG
     * @param {string} pk Contact's Public key
     * @param {string} coder BASE64/HEX
     * @param {string} format PNG/JPG
     * @returns {Promise<string>} Promise
     */

    getContactAvatar(pk, coder, format) {
        pk = pk || "";
        coder = coder || "BASE64";
        format = format || "PNG";
        return this.sendRequest("getContactAvatar", { "pk": pk, "coder": coder, "format": format });
    }

    /** 
     * Method getChannelAvatar returns to the Response field the avatar of the selected channel in the base64 or hex format.
     * @param {string} channelId Channel ID
     * @param {string} coder BASE64/HEX
     * @param {string} format PNG/JPG
     * @returns {Promise<string>} Promise
    */

    getChannelAvatar(channelId, coder, format) {
        channelId = channelId || "UTOPIA";
        coder = coder || "BASE64";
        format = format || "PNG";
        return this.sendRequest("getChannelAvatar", { "channelid": channelId, "coder": coder, "format": format });
    }

    /**
     * Method setContactGroup creates group or transfers selected contact into the group in the contact list. The method is called by using the Public Key parameters, which pass the Public Key of the contact (Public Key can be recognized by using the getContacts method) and Group Name, which passes the group name for creation or transfer (up to 32 symbols). In the Response field the status of completion of the operation is displayed.
     * @param {string} pk Contact's Public Key
     * @param {string} groupName Name of group, in which you would like to move contact
     * @returns {Promise<string>} Promise
     */

    setContactGroup(pk, groupName) {
        pk = pk || "";
        groupName = groupName || "Freedom Society";
        return this.sendRequest("setContactGroup", { "contactPublicKey": pk, "groupName": groupName });
    }

    /**
     * Method setContactNick sets the selected value for the Nickname field for the selected contact. The method is called by using the Public Key parameters, which pass on the Public Key for the contact (Public Key can be recognized by using the getContacts method) and New Nick, which passes on the new Nickname (up to 32 symbols). Empty value to be set as the Nickname Public Key of the contact. In the Response field the status of completion of the operation is displayed.
     * @param {string} pk Contact's Public Key
     * @param {string} newNick Nickname, that you would like to assign to contact
     * @returns {Promise<string>} Promise
     */

    setContactNick(pk, newNick) {
        pk = pk || "";
        newNick = newNick || "";
        return this.sendRequest("setContactNick", { "contactPublicKey": pk, "newNick": newNick });
    }

    /**
     * Method sendInstantMessage sends personal message(IM) to the selected contact from the contact list. The method is called by using the To parameter, that passes on the Public Key or Nickname to whom the message would be sent (Public Key can be recognized by using the getContacts method) and Text, which contains the text of the message. In the Response field the status of completion of the operation is displayed.
     * @param {string} to Contact's Public Key
     * @param {string} text Message
     * @returns {Promise<string>} Promise
     */

    sendInstantMessage(to, text) {
        to = to || "";
        text = text || "";
        return this.sendRequest("sendInstantMessage", { "to": to, "text": text });
    }

    /**
     * Method sendInstantQuote sends quote personal message(IM) to the selected contact from the contact list on message by id_message.
     * @param {string} to Contact's Public Key
     * @param {string} text Message
     * @param {string} messageId Quoted message ID
     * @returns {Promise<string>} Promise
     */

    sendInstantQuote(to, text, messageId) {
        to = to || "";
        text = text || "";
        messageId = messageId || "42";
        return this.sendRequest("sendInstantQuote", { "to": to, "text": text, "id_message": messageId });
    }

    /**
     * Method sendInstantSticker sends sticker personal message(IM) to the selected contact from the contact list a sticker from collection by name.
     * @param {string} to Contact's Public Key
     * @param {string} collection Stickers Collection ID
     * @param {string} name Sticker ID
     * @returns {Promise<string>} Promise
     */

    sendInstantSticker(to, collection, name) {
        to = to || "";
        collection = collection || "42";
        name = name || "42";
        return this.sendRequest("sendInstantSticker", { "to": to, "collection": collection, "name": name });
    }

    /**
     * Method getStickerCollections returns collection names of stickers.
     * @returns {Promise<string>} Promise
     */

    getStickerCollections() {
        return this.sendRequest("getStickerCollections");
    }

    /**
     * Method getStickerNamesByCollection returns available names from corresponded collection.
     * @param {string} collectionName Sticker Collection ID
     * @returns {Promise<string>} Promise
     */

    getStickerNamesByCollection(collectionName) {
        collectionName = collectionName || "42";
        return this.sendRequest("getStickerNamesByCollection", { "collection_name": collectionName });
    }

    /**
     * Method getImageSticker returns image by sticker name from corresponded collection in coder that can be equal "BASE64".
     * @param {string} collectionName Sticker Collection ID
     * @param {string} stickerName Sticker ID
     * @param {string} coder BASE64
     * @returns {Promise<string>} Promise
     */

    getImageSticker(collectionName, stickerName, coder) {
        collectionName = collectionName || "42";
        stickerName = stickerName || "42";
        coder = coder || "BASE64";
        return this.sendRequest("getImageSticker", { "collection_name": collectionName, "sticker_name": stickerName, "coder": coder });
    }

    /**
     * Method sendInstantBuzz sends buzz personal message(IM) to the selected contact from the contact list with comments.
     * @param {string} to Contact's Public Key
     * @param {string} comments Buzz comment
     * @returns {Promise<string>} Promise
     */

    sendInstantBuzz(to, comments) {
        to = to || "";
        comments = comments || "";
        return this.sendRequest("sendInstantBuzz", { "to": to, "comments": comments });
    }

    /**
     * Method sendInstantInvitation sends invitation personal message(IM) to the selected contact from the contact list with description and comments on channel_id.
     * @param {string} to Contact's Public Key
     * @param {string} channelId Channel ID
     * @param {string} description Description
     * @param {string} comments Comment, attached to invite
     * @returns {Promise<string>} Promise
     */

    sendInstantInvitation(to, channelId, description, comments) {
        to = to || "";
        channelId = channelId || "UTOPIA";
        description = description || "";
        comments = comments || "";
        this.sendRequest("sendInstantInvitation", {
            "to": to, "channelid": channelId, "description": description, "comments": comments
        });
    }

    /**
     * Method removeInstantMessages removes all personal message(IM) of the selected contact from the contact list.
     * @param {string} pk Contact's Public Key
     * @returns {Promise<string>} Promise
     */

    removeInstantMessages(pk) {
        pk = pk || "";
        return this.sendRequest("removeInstantMessages", { "hex_contact_public_key": pk })
    }

    /**
     * Method getContactMessages returns in the Response block the history of communication from personal chat with selected contact. The method is called by using the Public Key parameter, that passes on the Public Key of the contact (Public Key can be recognized by using the getContacts method)
     * @param {string} pk Contact's Public Key
     * @returns {Promise<string>} Promise
     */

    getContactMessages(pk) {
        pk = pk || "";
        return this.sendRequest("getContactMessages", { "pk": pk })
    }

    /**
     * Method sendEmailMessage sends uMail to the selected contact in the Utopia network. The method is called by using the To parameter, which passes on the Public Key or Nickname to which the uMail would be sent (Public Key can be recognized by using the getContacts method); Subject, that determines the subject of the email; and Body, which passes on the text in the body of the uMail. In the Response field the status of completion of the operation is displayed.
     * @param {string} to Contact's Public Key
     * @param {string} subject Email Subject
     * @param {string} body Email Body
     * @returns {Promise<string>} Promise
     */

    sendEmailMessage(to, subject, body) {
        to = to || "";
        subject = subject || "No subject";
        body = body || "";
        return this.sendRequest("sendEmailMessage", { "to": to, "subject": subject, "body": body })
    }

    /**
     * Method sendPayment sends cryptons transfer for the specified amount to the contact or to the card. The method is called by using the To parameters (nick, pk, cardid), which pass on the Public Key, Nickname or the card number of the user to whom the transfer would be sent (Public Key can be recognized by using the getContacts method); Amount, which transfers the amount of transfer (the number needs to be greater than 0 and contain no more than 9 character after coma); Comment is optional, which contains the text of the comment (up to 148 characters); as well as the optional 'From card' field can be specified, that passes on the card number from which the cryptons will be taken from. If the parameter is empty, then cryptons would be deducted from the main account. In the Response field the status of completion of the operation is displayed.
     * @param {string} cardId Card to send Cryptons from
     * @param {string} to Public Key or Card ID to send Cryptons on
     * @param {string} amount Amount of Cryptons to be sent
     * @param {string} comment Comment, attached to payment
     * @returns {Promise<string>} Promise
     */

    sendPayment(cardId, to, amount, comment) {
        cardId = cardId || "";
        to = to || "";
        amount = amount || "0";
        comment = comment || "";
        return this.sendRequest("sendPayment", {
            "cardid": cardId, "to": to, "amount": amount, "comment": comment
        })
    }

    /**
     * Method getEmailFolder returns to the Response block the list of identifications of uMail emails in the selected folder by using specified search filter. The method is called by using the FolderType parameters, which pass on the number of the folder from which the list should be taken (numbers of the folders 1-Inbox, 2-Drafts, 4-Sent, 8-Outbox, 16-Trash) and it is possible to specify the Filter parameter, which passes on the text value for the search of emails in uMail (has to contain the full or partial match with the Public Key, Nickname or the text of email).
     * @param {string} folderType 1 - Inbox | 2 - Drafts | 4 - Sent | 8 - Outbox | 16 - Trash
     * @param {string} filter Filter string
     * @returns {Promise<string>} Promise
     */

    getEmailFolder(folderType, filter) {
        folderType = folderType || "1";
        filter = filter || "";
        return this.sendRequest("getEmailFolder", { "folderType": folderType, "filter": filter })
    }

    /**
     * Method getEmails returns to the Response block the list of detailed of uMail emails in the selected folder by using specified search filter. The method is called by using the FolderType parameters, which pass on the number of the folder from which the list should be taken (numbers of the folders 1-Inbox, 2-Drafts, 4-Sent, 8-Outbox, 16-Trash) and it is possible to specify the Filter parameter, which passes on the text value for the search of emails in uMail (has to contain the full or partial match with the Public Key, Nickname or the text of email).
     * @param {string} folderType 1 - Inbox | 2 - Drafts | 4 - Sent | 8 - Outbox | 16 - Trash
     * @param {string} filter Filter string
     * @returns {Promise<string>} Promise
     */

    getEmails(folderType, filter) {
        folderType = folderType || "1";
        filter = filter || "";
        return this.sendRequest("getEmails", { "folderType": folderType, "filter": filter })
    }

    /**
     * Method getEmailById returns the information based on the selected email in uMail. The method is called by using the Id parameter, which passes on the id of the email (id of the email can be found by using getEmailFolder method).
     * @param {string} id Email ID
     * @returns {Promise<string>} Promise
     */

    getEmailById(id) {
        id = id || "";
        return this.sendRequest("getEmailById", { "id": id })
    }

    /**
     * Method deleteEmail deletes email in uMail. First deletion will move email to the Trash, subsequent will remove from the database. The method is called by using the Id parameter which passes on the id of the email (id of the email can be found by using getEmailFolder method). In the Response field the status of completion of the operation is displayed.
     * @param {string} id Email ID
     * @returns {Promise<string>} Promise
     */

    deleteEmail(id) {
        id = id || "";
        return this.sendRequest("deleteEmail", { "id": id })
    }

    /**
     * Method sendReplyEmailMessage creates response email in uMail for the incoming email and sends it to the contact with new message. The method is called by using the Id parameters, which pass on the id of the email (id of the email can be found by using getEmailFolder method) and Body, which passes on the text of the email in uMail. In the Response field the status of completion of the operation is displayed.
     * @param {string} id Email ID to reply
     * @param {string} body Reply body
     * @returns {Promise<string>} Promise
     */

    sendReplyEmailMessage(id, body) {
        id = id || "";
        body = body || "";
        return this.sendRequest("sendReplyEmailMessage", { "id": id, "body": body })
    }

    /**
     * Method sendForwardEmailMessage creates response email for an incoming email in uMail and sends it to the selected contact with the new message. The method is called by using the 'Id' parameter, which passes on the id of the email (id of the email can be found by using getEmailFolder method); 'To', which passes on the Public Key or Nickname of the user to which the email will be sent; and 'Body', which passes on the text in uMail. In the Response field the status of completion of the operation is displayed.
     * @param {string} id Email ID to forward
     * @param {string} to Contact's Public Key
     * @param {string} body Email body
     * @returns {Promise<string>} Promise
     */

    sendForwardEmailMessage(id, to, body) {
        id = id || "";
        to = to || "";
        body = body || "";
        return this.sendRequest("sendForwardEmailMessage", { "id": id, "to": to, "body": body })
    }

    /**
     * Method getFinanceSystemInformation returns in the Response field the information about Utopia financial system (information about fees and limits). Method is called without using any parameters.
     * @returns {Promise<string>} Promise
     */

    getFinanceSystemInformation() {
        return this.sendRequest("getFinanceSystemInformation")
    }

    /**
     * Method getBalance returns in the Response field the amount of cryptons on the primary balance, without considering the balance on cards. Method is called without using any parameters.
     * @returns {Promise<string>} Promise
     */

    getBalance() {
        return this.sendRequest("getBalance")
    }

    /**
     * Method getFinanceHistory allows to receive the history of financial transactions based on the specifications in the parameters of the filter. Filters can be combined by using coma : 'ALL_CARDS,ALL_FEE'. Also the method accepts as the parameter (reference number), which passes on the number of the transaction which the history should be displayed (empty parameter will start returning information starting from the last message).
     * @param {string} filters ALL_CARDS | INCOMING_CARDS | OUTGOING_CARDS | CREATED_CARDS | DELETED_CARDS | ALL_TRANSFERS | INCOMING_TRANSFERS | OUTGOING_TRANSFERS | ALL_REQUESTS | AWAITING_REQUESTS | AUTHORIZED_REQUESTS | DECLINED_REQUESTS | CANCELED_REQUESTS | EXPIRED_REQUESTS | ALL_APPROVED_REQUESTS | CREATED_VOUCHERS | CREATED_VOUCHERS_BATCH | ACTIVATED_VOUCHERS | DELETED_VOUCHERS | ALL_VOUCHERS | ALL_MINING | ALL_INTEREST | ALL_FEE | ALL_UNS_RECORDS | UNS_UNS_REGISTRATION | UNS_UNS_CHANGED | UNS_UNS_TRANSFERRED | UNS_UNS_DELETED | ALL_TRANSACTIONS
     * @param {string} referenceNumber
     * @param {string} toDate 
     * @param {string} fromDate
     * @param {string} batchId
     * @param {string} fromAmount
     * @param {string} toAmount
     * @returns {Promise<string>} Promise
     */

    getFinanceHistory(filters, referenceNumber, toDate, fromDate, batchId, fromAmount, toAmount) {
        filters = filters || "";
        referenceNumber = referenceNumber || "";
        toDate = toDate || "";
        fromDate = fromDate || "";
        batchId = batchId || "";
        fromAmount = fromAmount || "";
        toAmount = toAmount || "";
        return this.sendRequest("getFinanceHistory", {
            "filters": filters, "referenceNumber": referenceNumber,
            "toDate": toDate, "fromDate": fromDate, "batchId": batchId,
            "fromAmount": fromAmount, "toAmount": toAmount
        })
    }

    /**
     * Method getCards returns in the Response field the current list of cards and their detailed information from uWallet. Method is called without using any parameters.
     * @returns {Promise<string>} Promise
     */

    getCards() {
        return this.sendRequest("getCards")
    }

    /**
     * Method addCard sends the request for creation of new card in uWallet. The method is called by using the following parameters: Name, which passes on the name of the new card (can contain between 1 and 32 symbols), Color, which passes on the color of the card ( in RGB format, for example '#FFFFFF') and also can specify the First 4 numbers of the card for customization ( it is possible to change only 4 first symbols, can contain symbols (A-F) and numbers (0-9)). In the Response field the status of completion of the operation is displayed.
     * @param {string} name Card name
     * @param {string} color RGB color in HEX
     * @param {string} numbers First 4 card symbols
     * @returns {Promise<string>} Promise
     */

    addCard(name, color, numbers) {
        name = name || ":)";
        color = color || "";
        numbers = numbers || "";
        return this.sendRequest("addCard", { "name": name, "color": color, "preorderNumberInCard": numbers })
    }

    /**
     * Method deleteCard deletes the existing card from uWallet. The amount from card will be returned to the main balance. The following parameter is specified: CardId, which passes on the card number ( CardId can be found by using the getCards method). In the Response field the status of completion of the operation is displayed.
     * @param {string} cardId Card ID
     * @returns {Promise<string>} Promise
     */

    deleteCard(cardId) {
        cardId = cardId || "";
        return this.sendRequest("deleteCard", { "cardid": cardId })
    }

    /**
     * Method enableMining turns on the mining in the Utopia client (mining is available only for x64 client). As a parameter the Status (true/false) is specified, which turns on or off the mining process. In the Response field the status of completion of the operation is displayed.
     * @param {string} enabled
     * @returns {Promise<string>} Promise
     */

    enableMining(enabled) {
        enabled = enabled || "true";
        return this.sendRequest("enableMining", { "enable": enabled })
    }

    /**
     * Calling the enableInterest method turns on and off the daily interest on the remaining irreducible account balance. As a parameter, one of the two statuses, true or false is selected. In the Response field the status of completion of turning on or off the operation is displayed.
     * @param {string} enabled
     * @returns {Promise<string>} Promise
     */

    enableInterest(enabled) {
        enabled = enabled || "true";
        return this.sendRequest("enableInterest", { "enable": enabled })
    }

    /**
     * Calling the enableHistoryMining method changes the option of the automatic reading of the mining history from the financial server. As a parameter of the method, the status of true or false is specified. In the Response field the status of completion of turning on or off the operation is displayed.
     * @param {string} enabled
     * @returns {Promise<string>} Promise
     */

    enableHistoryMining(enabled) {
        enabled = enabled || "true";
        return this.sendRequest("enableHistoryMining", { "enable": enabled })
    }

    /**
     * Calling the statusHistoryMining method returns in the Response block the status of mining history poll. Method is called without using any parameters.
     * Meaning of different states:
     * 0 = STATE_EMPTY
     * 1 = STATE_IN_PROGRESS
     * 2 = STATE_RECEIVED_RESPONSE
     * @returns {Promise<string>} Promise
     */

    statusHistoryMining() {
        return this.sendRequest("statusHistoryMining")
    }

    /**
     * Method getMiningBlocks returns to the Response field the information about the mining blocks for which the reward has been paid. The method is called without using any parameters. 
     * @returns {Promise<string>} Promise
     */

    getMiningBlocks() {
        return this.sendRequest("getMiningBlocks")
    }

    /**
     * Method getMiningInfo returns statistics value of mining process.
     * @returns {Promise<string>} Promise
     */

    getMiningInfo() {
        return this.sendRequest("getMiningInfo")
    }

    /**
     * Method getVouchers returns to the Response field the information about existing vouchers as a list. The method is called without using any parameters. ).
     * @returns {Promise<string>} Promise
     */

    getVouchers() {
        return this.sendRequest("getVouchers")
    }

    /**
     * Method createVoucher with the mandatory parameter 'amount' creates new voucher for the selected amount in the list of own vouchers. The amount for the vouchers is taken from the main account balance. Amount, which transfers the amount of transfer (the number needs to be greater than 0 and contain no more than 9 character after coma); 
     * @param {string} amount Amount of Cryptons
     * @returns {Promise<string>} Promise
     */

    createVoucher(amount) {
        amount = amount || "0.000000001";
        return this.sendRequest("createVoucher", { "amount": amount })
    }

    /**
     * Method useVoucher allows to use the selected voucher with adding its amount to your main account. The method is called with mandatory 'VoucherId' parameter in which the number of the voucher is specified.
     * @param {string} voucherId
     * @returns {Promise<string>} Promise
     */

    useVoucher(voucherId) {
        return this.sendRequest("useVoucher", { "voucherid": voucherId })
    }

    /**
     * Method deleteVoucher allows to remove your own voucher from the existing list with having the amount refunded back to your account. The method is called with mandatory 'VoucherId' parameter in which the number of the voucher is specified. In the Response field the status of completion of the operation is displayed.
     * @param {string} voucherId
     * @returns {Promise<string>} Promise
     */

    deleteVoucher(voucherId) {
        return this.sendRequest("deleteVoucher", { "voucherid": voucherId })
    }

    /**
     * Method getInvoices returns to the Response field the list of active invoiced. The method is called with using any optional parameters.
     * @param {string} cardId 
     * @param {string} invoiceId
     * @param {string} pk
     * @param {string} transactionId
     * @param {string} status
     * @param {string} startDateTime
     * @param {string} endDateTime
     * @param {string} referenceNumber
     * @returns {Promise<string>} Promise
     */

    getInvoices(cardId, invoiceId, pk, transactionId, status, startDateTime, endDateTime, referenceNumber) {
        cardId = cardId || "";
        invoiceId = invoiceId || "";
        pk = pk || "";
        transactionId = transactionId || "";
        status = status || "";
        startDateTime = startDateTime || "";
        endDateTime = endDateTime || "";
        referenceNumber = referenceNumber || "";
        return this.sendRequest("getInvoices", {
            "cardId": cardId, "invoiceId": invoiceId, "pk": pk,
            "transactionId": transactionId, "status": status,
            "startDateTime": startDateTime, "endDateTime": endDateTime,
            "referenceNumber": referenceNumber
        })
    }

    /**
     * Method getInvoiceByReferenceNumber allows to receive 'batchid' of the invoice using the ReferenceNumber. In the Response field, batchid is returned, which is considered a successful status for completion of the operation.
     * @param {string} referenceNumber
     * @returns {Promise<string>} Promise
     */

    getInvoiceByReferenceNumber(referenceNumber) {
        referenceNumber = referenceNumber || "1";
        return this.sendRequest("getInvoiceByReferenceNumber", { "referenceNumber": referenceNumber })
    }

    /**
     * Method getTransactionIdByReferenceNumber allows to receive 'batchid' of the transaction by using the ReferenceNumber. In the Response field, batchid is returned, which is considered a successful status for completion of the operation.
     * @param {string} referenceNumber
     * @returns {Promise<string>} Promise
     */

    getTransactionIdByReferenceNumber(referenceNumber) {
        referenceNumber = referenceNumber || "1";
        return this.sendRequest("getTransactionIdByReferenceNumber", { "referenceNumber": referenceNumber })
    }

    /**
     * Method sendInvoice sends invoice (Request Cryptons) for deduction of specified amount from specified card. In the parameters of the method, the card number of the request recipient is specified (CardId). In the second parameter the 'Amount' is specified which transfers the amount of transfer (the number needs to be greater than 0 and contain no more than 9 character after coma), and the third parameter is optional, where 'Comment is optional, which contains the text of the comment (up to 148 characters). 
     * @param {string} cardId Card to send invoice to
     * @param {string} amount Amount of Cryptons to request
     * @param {string} comment Comment
     * @returns {Promise<string>} Promise
     */

    sendInvoice(cardId, amount, comment) {
        cardId = cardId || "";
        amount = amount || "";
        comment = comment || "";
        return this.sendRequest("sendInvoice", { "cardid": cardId, "amount": amount, "comment": comment })
    }

    /**
     * Method acceptInvoice performs payment of the incoming invoice. The method is called with mandatory 'InvoiceId' parameter in which the ID of the invoice that needs to be rejected. For receiving ID of the needed invoice it is needed to call getInvoices for receiving the list of invoices with their detailed information. In response the acceptInvoice method returns in the Response block the results of completing this request. 
     * @param {string} invoiceId
     * @returns {Promise<string>} Promise
     */

    acceptInvoice(invoiceId) {
        invoiceId = invoiceId || "";
        return this.sendRequest("acceptInvoice", { "invoiceid": invoiceId })
    }

    /**
     * Method declineInvoice sends request for declining the payment for the incoming invoice. The method is called with mandatory the 'InvoiceId' parameter. Parameter InvoiceId contains the ID value for the invoice that needs to be declined. To get the ID of the required invoice it is mandatory to call the getInvoices method for receiving the list of invoices with their detailed information. In response the declineInvoice method returns in the Response block the results of completing this request. 
     * @param {string} invoiceId
     * @returns {Promise<string>} Promise
     */

    declineInvoice(invoiceId) {
        invoiceId = invoiceId || "";
        return this.sendRequest("declineInvoice", { "invoiceid": invoiceId })
    }

    /**
     * Method cancelInvoice allows to cancel the already created invoice. The method is called with mandatory 'InvoiceId' parameter. Parameter InvoiceId contains the ID value for the invoice that needs to be declined. To get the ID of the required invoice it is mandatory to call the getInvoices method for receiving the list of invoices with their detailed information. In response the declineInvoice method returns in the Response block the results of completing this request. 
     * @param {string} invoiceId
     * @returns {Promise<string>} Promise
     */

    cancelInvoice(invoiceId) {
        invoiceId = invoiceId || "";
        return this.sendRequest("cancelInvoice", { "invoiceid": invoiceId })
    }

    /**
     * Method requestUnsTransfer allows to transfer the uNS record to contact. The method is called with mandatory 'Name' and 'Public Key' parameters. Name parameter is the name of the uNS record from the list of own uNS records. hexNewOwnerPk represents hash of the public portion of the key (as in some instances, key is now known, only hash is), to which the transfer is being made. In the Response field the status of completion of the operation is displayed. 
     * @param {string} name uNS name to transfer
     * @param {string} newOwnerPk New owner's Public Key
     * @returns {Promise<string>} Promise
     */

    requestUnsTransfer(name, newOwnerPk) {
        name = name || "";
        newOwnerPk = newOwnerPk || "";
        return this.sendRequest("requestUnsTransfer", { "name": name, "hexNewOwnerPk": newOwnerPk })
    }

    /**
     * Method acceptUnsTransfer allows to accept the incoming record of the uNS transfer. The method is called with the mandatory 'RequesId' parameter, which represents the id of the incoming uNS transfer. To receive the id of incoming transfers it is necessary to call the incomingUnsTransfer method, which returns the list of incoming uNS transfer. In the Response field the status of completion of the acceptUnsTransfer operation is displayed. 
     * @param {string} requestId uNS transfer request ID
     * @returns {Promise<string>} Promise
     */

    acceptUnsTransfer(requestId) {
        requestId = requestId || "";
        return this.sendRequest("acceptUnsTransfer", { "requestid": requestId })
    }

    /**
     * Method declineUnsTransfer allows to decline the incoming record of the uNS transfer. The method is called with the mandatory 'RequesId' parameter, which represents the id of the incoming uNS transfer. To receive the id of incoming transfers it is necessary to call the incomingUnsTransfer method, which returns the list of incoming uNS transfer. In the Response field the status of completion of the declineUnsTransfer operation is displayed. 
     * @param {string} requestId uNS transfer request ID
     * @returns {Promise<string>} Promise
     */

    declineUnsTransfer(requestId) {
        requestId = requestId || "";
        return this.sendRequest("declineUnsTransfer", { "requestid": requestId })
    }

    /**
     * Method incomingUnsTransfer returns in the Response field the list of all incoming uNS transfer records with their detailed information. The method is called without using any parameters.
     * @returns {Promise<string>} Promise
     */

    incomingUnsTransfer() {
        return this.sendRequest("incomingUnsTransfer")
    }

    /**
     * Method outgoingUnsTransfer returns in the Response field the list of all outgoing uNS transfer records with their detailed information. The method is called without using any parameters.
     * @returns {Promise<string>} Promise
     */

    outgoingUnsTransfer() {
        return this.sendRequest("outgoingUnsTransfer")
    }

    /**
     * Attention! The method storageWipe irrevocably removes all databases of the user. The method is called without using any parameters. In the Response field the status of completion of the operation is displayed.
     * @returns {Promise<string>} Promise
     */

    storageWipe() {
        return this.sendRequest("storageWipe")
    }

    /**
     * Method sendAuthorizationRequest allows to send the authorization request to add the user to the contact list. The method is called with mandatory use of 'Public Key' and 'Message' parameters. The Public Key parameter represents the Public Key of the person being added. The message parameter represents itself the text message with the request to be authorized. In the Response field the status of completion of sending such request is displayed.
     * @param {string} pk
     * @param {string} message 
     * @returns {Promise<string>} Promise
     */

    sendAuthorizationRequest(pk, message) {
        pk = pk || "";
        message = message || "";
        return this.sendRequest("sendAuthorizationRequest", { "pk": pk, "message": message })
    }

    /**
     * Method acceptAuthorizationRequest accepts the incoming authorization request to add user to contacts. The method is called with mandatory use of 'Public Key' and 'Message' parameters. The Public Key parameter represents the Public Key of the person who send the authorization request. The message parameter represents itself the text message. In the Response field the status of completion of sending such request is displayed.
     * @param {string} pk
     * @param {string} message
     * @returns {Promise<string>} Promise
     */

    acceptAuthorizationRequest(pk, message) {
        pk = pk || "";
        message = message || "";
        return this.sendRequest("acceptAuthorizationRequest", { "pk": pk, "message": message })
    }

    /**
     * Method rejectAuthorizationRequest declines the incoming authorization request from user with Public key, which is specified as first parameter (Public Key) of the rejectAuthorizationRequest method. The second parameter of the method is Message row, that represents itself the response message the user who`s authorization is rejected. In the Response field the status of completion of such request is displayed.
     * @param {string} pk
     * @param {string} message
     * @returns {Promise<string>} Promise
     */

    rejectAuthorizationRequest(pk, message) {
        pk = pk || "";
        message = message || "";
        return this.sendRequest("rejectAuthorizationRequest", { "pk": pk, "message": message })
    }

    /**
     * Method deleteContact allows to perform the operation of removing selected user from the list of contacts. The method is called with mandatory use of 'Public Key' parameter that represents Public key of the to be removed contact. In the Response field the status of completion of such operation is displayed.
     * @param {string} pk
     * @returns {Promise<string>} Promise
     */

    deleteContact(pk) {
        pk = pk || "";
        return this.sendRequest("deleteContact", { "pk": pk })
    }

    /**
     * Method getChannels returns in the Response field the current list of all channels of Utopia ecosystem, it is possible to search by name of the channel (partial or complete matching). As a parameter, a Filter can be specified, which can be used for searching of the channel by name ( has to contain full or partial matching of the channel name).
     * @param {string} filter
     * @param {string} channelType
     * @returns {Promise<string>} Promise
     */

    getChannels(filter, channelType) {
        filter = filter || "";
        channelType = channelType || "";
        return this.sendRequest("getChannels", { "filter": filter, "channel_type": channelType })
    }

    /**
     * Method sendChannelMessage creates and sends message in the selected channel (to send the message the user should have joined this channel and needs to have status 'online'). To enter the channel, use joinChannel method. As a parameter the method is using the ChannelId, which passes on the id of the channel in which the message is being sent (finding the id of the channel is possible by using the getChannels method) and Message, which contains the text of the message being sent. In the Response field the status of completion of the operation is displayed.
     * @param {string} channelId
     * @param {string} message
     * @returns {Promise<string>} Promise
     */

    sendChannelMessage(channelId, message) {
        channelId = channelId || "UTOPIA";
        message = message || "How to use Utopia Node.js API?";
        return this.sendRequest("sendChannelMessage", { "channelid": channelId, "message": message })
    }

    /**
     * Method sendChannelPicture creates and sends message with picture in base64 format
     * @param {string} channelId
     * @param {string} imageFilename Image filename
     * @param {string} base64Image (Optional) Use this if you have encoded Base64 image
     * @returns {Promise<string>} Promise
     */
    sendChannelPicture(channelId, imageFilename, base64Image) {
        channelId = channelId || "";
        base64Image = base64Image || "";
        imageFilename = imageFilename || "";
        if (imageFilename && !base64Image) {
            if (fs.existsSync(imageFilename)) {
                if (fs.lstatSync(imageFilename).isFile()) {
                    var base64Image = Buffer.from(fs.readFileSync(imageFilename)).toString("base64");
                } else {
                    return { "error": "path is a directory" };
                }
            } else {
                return { "error": "file does not exist" };
            }
        } else {
            return { "error": "filename parameter is required" };
        }
        return this.sendRequest("sendChannelPicture", {
            "channelid": channelId, "base64_image": base64Image,
            "filename_image": imageFilename
        })
    }

    /**
     * Method joinChannel executes an entry into selected channel. The following parameters are specified: ChannelId, which passes on the id of the channel in which the message is being sent (finding the id of the channel is possible by using the getChannels method); when needed the parameter Password is specified, which passes on the password for entry into the channel (if left empty, no password is required). In the Response field the status of completion of the operation is displayed.
     * @param {string} channelId 
     * @param {string} password
     * @returns {Promise<string>} Promise
     */

    joinChannel(channelId, password) {
        channelId = channelId || "";
        password = password || "";
        return this.sendRequest("joinChannel", { "ident": channelId, "password": password })
    }

    /**
     * Method leaveChannel executes the exit from the selected channel. As a parameter the method takes the ChannelId, which passes on the id of the channel in which the message is being sent (finding the id of the channel is possible by using the getChannels method .
     * @param {string} channelId 
     * @returns {Promise<string>} Promise
     */

    leaveChannel(channelId) {
        channelId = channelId || "";
        return this.sendRequest("leaveChannel", { "channelid": channelId })
    }

    /**
     * Method getChannelMessages returns in the Response block the history of communication from selected channel. The method is called by using the channelid parameter, that passes on id of channel.
     * @param {string} channelId 
     * @returns {Promise<string>} Promise
     */

    getChannelMessages(channelId) {
        channelId = channelId || "";
        return this.sendRequest("getChannelMessages", { "channelid": channelId })
    }

    /**
     * Method getChannelInfo returns in the Response field the information about the channel ( the response contains following parameters: HideInCommonList, description, geotag, hashtags, languages, readonly, title, type, private). As a parameter the method is using the ChannelId for which the user is trying to find more information (finding the id of the channel is possible by using the getChannels method).
     * @param {string} channelId 
     * @returns {Promise<string>} Promise
     */

    getChannelInfo(channelId) {
        channelId = channelId || "";
        return this.sendRequest("getChannelInfo", { "channelid": channelId })
    }

    /**
     * Method getChannelModerators returns in the Response field the list of Public Keys of moderators. As a parameter the ChannelId is used (finding the id of the channel is possible by using the getChannels method).
     * @param {string} channelId 
     * @returns {Promise<string>} Promise
     */

    getChannelModerators(channelId) {
        channelId = channelId || "";
        return this.sendRequest("getChannelModerators", { "channelid": channelId })
    }

    /**
     * Method getChannelContacts returns in the Response field the list of contacts on channel with details.
     * @param {string} channelId 
     * @returns {Promise<string>} Promise
     */

    getChannelContacts(channelId) {
        channelId = channelId || "";
        return this.sendRequest("getChannelContacts", { "channelid": channelId })
    }

    /**
     * Method getChannelModeratorRight returns in the Response field the list of moderator rights in the channel ( the response contains parameters as ban, delete, promote). As a parameter the method uses: ChannelId from which it is needed to get the list of moderator rights (finding the id of the channel is possible by using the getChannels method) and Public Key of the channel moderator (finding Public Key(pk) of the channel moderator is possible by using the getChannelModerators method). 
     * @param {string} channelId 
     * @param {string} moderator
     * @returns {Promise<string>} Promise
     */

    getChannelModeratorRight(channelId, moderator) {
        channelId = channelId || "";
        moderator = moderator || "";
        return this.sendRequest("getChannelModeratorRight", { "channelid": channelId, "moderator": moderator })
    }

    /**
     * Method createChannel creates uchan record.
     * @param {string} channelName Channel name
     * @param {string} description Channel description
     * @param {string} readOnly 
     * @param {string} password Channel password
     * @param {string} language 
     * @param {string} hashtags
     * @param {string} geoTag
     * @param {string} base64AvatarImage Channel avatar image
     * @param {string} hideInUI Don't show in channel manager
     * @returns {Promise<string>} Promise
     */

    createChannel(channelName, description, readOnly, password, language, hashtags, geoTag, base64AvatarImage, hideInUI) {
        channelName = channelName || "";
        description = description || "";
        readOnly = readOnly || "";
        password = password || "";
        language = language || "";
        hashtags = hashtags || "";
        hideInUI = hideInUI || "";
        geoTag = geoTag || "";
        base64AvatarImage = base64AvatarImage || "";
        return this.sendRequest("createChannel", {
            "channel_name": channelName, "description": description,
            "read_only": readOnly, "password": password,
            "language": language, "hashtags": hashtags, "geoTag": geoTag,
            "base64_avatar_image": base64AvatarImage,
            "hide_in_UI": hideInUI
        })
    }

    /**
     * Method modifyChannel changes uchan record properties.
     * @param {string} channelId
     * @param {string} description Channel description
     * @param {string} readOnly 
     * @param {string} password Channel password
     * @param {string} language 
     * @param {string} hashtags
     * @param {string} geoTag
     * @param {string} base64AvatarImage Channel avatar image
     * @param {string} hideInUI Don't show in channel manager
     * @returns {Promise<string>} Promise
     */

    modifyChannel(channelId, description, readOnly, language, hashtags, geoTag, base64AvatarImage, hideInUI) {
        channelId = channelId || "";
        description = description || "";
        readOnly = readOnly || "";
        password = password || "";
        language = language || "";
        hashtags = hashtags || "";
        hideInUI = hideInUI || "";
        geoTag = geoTag || "";
        base64AvatarImage = base64AvatarImage || "";
        return this.sendRequest("createChannel", {
            "channelid": channelId, "description": description,
            "read_only": readOnly, "language": language, "hashtags": hashtags,
            "geoTag": geoTag, "base64_avatar_image": base64AvatarImage,
            "hide_in_UI": hideInUI
        })
    }

    /**
     * Method deleteChannel deletes uchan record.
     * @param {string} channelId
     * @returns {Promise<string>} Promise
     */

    deleteChannel(channelId) {
        channelId = channelId || "";
        return this.sendRequest("deleteChannel", { "channelid": channelId })
    }

    /**
     * Method getChannelSystemInfo returns system properties of channels.
     * @returns {Promise<string>} Promise
     */

    getChannelSystemInfo() {
        return this.sendRequest("getChannelSystemInfo")
    }

    /**
     * Method unsCreateRecordRequest sends request for uNS name registration in the Utopia ecosystem for the selected term. As a parameter the uNS name is used (the name contains symbols (A-Z), numbers (0-9), dash symbol (-) and period (.) and can be no greater than 32 symbols in length.) and Valid (yyyy-mm-dd), which passes on the final date of the term for this name(uNS) (by default 6 months), isPrimary which specifies if the uNS Name is primary, and ChannelId, which passes on the id of the channel in which the message is being sent (finding the id of the channel is possible by using the getChannels method). In the Response field the status of completion of the operation is displayed.
     * @param {string} channelId If you want to assign this uNS name to channel
     * @param {string} nick uNS name
     * @param {string} valid uNS name expiration date
     * @param {string} isPrimary If you want to make uNS your primary name
     * @returns {Promise<string>} Promise
     */

    unsCreateRecordRequest(nick, valid, isPrimary, channelId) {
        channelId = channelId || "";
        nick = nick || "";
        valid = valid || "";
        isPrimary = isPrimary || "";
        return this.sendRequest("unsCreateRecordRequest", {
            "nick": nick, "valid": valid, "isPrimary": isPrimary,
            "channelId": channelId
        })
    }

    /**
     * Method unsModifyRecordRequest sends request for uNS name registration in the Utopia ecosystem for the selected term. As a parameter the uNS name is used (the name contains symbols (A-Z), numbers (0-9), dash symbol (-) and period (.) and can be no greater than 32 symbols in length.) and Valid (yyyy-mm-dd), which passes on the final date of the term for this name(uNS) (by default 6 months). In the Response field the status of completion of the operation is displayed.
     * @param {string} channelId If you want to assign this uNS name to channel
     * @param {string} nick uNS name
     * @param {string} valid uNS name expiration date
     * @param {string} isPrimary If you want to make uNS your primary name
     * @returns {Promise<string>} Promise
     */

    unsModifyRecordRequest(nick, valid, isPrimary, channelId) {
        channelId = channelId || "";
        nick = nick || "";
        valid = valid || "";
        isPrimary = isPrimary || "";
        return this.sendRequest("unsCreateRecordRequest", {
            "nick": nick, "valid": valid, "isPrimary": isPrimary,
            "channelId": channelId
        })
    }

    /**
     * Method unsDeleteRecordRequest sends request for deletion of uNS name of the current user. As a parameter the uNS name is used ( uNS name can be found by using the unsRegisteredNames method). In the Response field the status of completion of the operation is displayed.
     * @param {string} nick uNS name
     * @returns {Promise<string>} Promise
     */

    unsDeleteRecordRequest(nick) {
        nick = nick || "";
        return this.sendRequest("unsDeleteRecordRequest", { "nick": nick })
    }

    /**
     * Method unsSearchByPk returns in the Response field the list of all uNS names with selected 'Filter' parameter (contains full or partial matching with the searched uNS name. The name can contain symbols (A-Z), numbers (0-9), dash symbol (-) and period (.) and can be no greater than 32 symbols in length.).
     * @param {string} filter
     * @returns {Promise<string>} Promise
     */

    unsSearchByPk(filter) {
        filter = filter || "";
        return this.sendRequest("unsSearchByPk", { "filter": filter })
    }

    /**
     * Method unsSearchByNick returns the list of uNS names by partial or full matching with selected 'Filter' parameter (contains full or partial matching with the searched uNS name. The name can contain symbols (A-Z), numbers (0-9), dash symbol (-) and period (.) and can be no greater than 32 symbols in length.).
     * @param {string} filter
     * @returns {Promise<string>} Promise
     */

    unsSearchByNick(filter) {
        filter = filter || "";
        return this.sendRequest("unsSearchByNick", { "filter": filter })
    }

    /**
     * Method getUnsSyncInfo returns statistics value of sync process.
     * @returns {Promise<string>} Promise
     */

    getUnsSyncInfo() {
        return this.sendRequest("getUnsSyncInfo")
    }

    /**
     * Method unsRegisteredNames returns in the Response field the list of all registered uNS for current user. The method is called without using any parameters. 
     * @returns {Promise<string>} Promise
     */

    unsRegisteredNames() {
        return this.sendRequest("unsRegisteredNames")
    }

    /**
     * Method summaryUnsRegisteredNames returns the list count of uNS names by each day
     * @param {string} dateFrom
     * @param {string} dateTo
     * @returns {Promise<string>} Promise
     */

    summaryUnsRegisteredNames(dateFrom, dateTo) {
        dateTo = dateTo || "";
        dateFrom = dateFrom || "";
        return this.sendRequest("summaryUnsRegisteredNames", { "from_date": dateFrom, "to_date": dateTo })
    }

    /**
     * Method clearTrayNotifications allows to drop all existing notifications in the tray of the operating system. The method is called without using any parameters. In the Response field the status of completion of the operation is displayed.
     * @returns {Promise<string>} Promise
     */

    clearTrayNotifications() {
        return this.sendRequest("clearTrayNotifications")
    }

    /**
     * Method getNetworkConnections returns in Response block detailed information about all current network connections. The method is called without using any parameters. 
     * @returns {Promise<string>} Promise
     */

    getNetworkConnections() {
        return this.sendRequest("getNetworkConnections")
    }

    /**
     * Method getProxyMappings returns in Response block the list of all configured proxy mappings. The method is called without using any parameters. 
     * @returns {Promise<string>} Promise
     */

    getProxyMappings() {
        return this.sendRequest("getProxyMappings")
    }

    /**
     * Method createProxyMapping allows to create a 'bridge' type of connections to receive access to the external page by the specified ip address and port, when trying to call the inter-network address in the Utopia network ( usually used by Idyll browser). The method by using the mandatory parameters SrcHost,SrcPort,DstHost,DstPort,Enabled. The SrcHost parameters represents its own uNS name, the request of which would be executed in the Idyll browser. The SrcPort parameter represents the port number on which the mapping is planned to be located. Parameter DstHost represents itself the ip address of the page on which it will navigate, and parameters DstPort is the number of port on which the needed page with specified ip address is located. The Enabled parameter represents the activity of such connection as 'true' or 'false'. In the Response block the status of completion of the attempt to create a connection with specified parameters is displayed.
     * @param {string} srcHost 127.0.0.1
     * @param {string} srcPort 80
     * @param {string} dstHost uNS name
     * @param {string} dstPort 80
     * @param {string} enabled Enable after creation
     * @returns {Promise<string>} Promise
     */

    createProxyMapping(srcHost, srcPort, dstHost, dstPort, enabled) {
        srcHost = srcHost || "";
        srcPort = srcPort || "";
        dstHost = dstHost || "";
        dstPort = dstPort || "";
        enabled = enabled || "true";
        return this.sendRequest("createProxyMapping", {
            "srcHost": srcHost, "srcPort": srcPort, "dstHost": dstHost,
            "dstPort": dstPort, "enabled": enabled
        })
    }

    /**
     * Method enableProxyMapping allows to turn on the ability to use the connection with specified 'MappingId' as a parameter when calling this method. To receive the 'MappingId' of the needed connection it is necessary to call the getProxyMappings method. In the Response field the status of completion of operation of turning on the connection is displayed.
     * @param {string} mappingId 
     * @returns {Promise<string>} Promise
     */

    enableProxyMapping(mappingId) {
        mappingId = mappingId || "";
        return this.sendRequest("enableProxyMapping", { "mappingId": mappingId })
    }

    /**
     * Method disableProxyMapping allows to turn off the ability to use the connection with specified 'MappingId' as a parameter when calling this method. To receive the 'MappingId' of the needed connection it is necessary to call the getProxyMappings method. In the Response field the status of completion of operation of turning off the connection is displayed.
     * @param {string} mappingId 
     * @returns {Promise<string>} Promise
     */

    disableProxyMapping(mappingId) {
        mappingId = mappingId || "";
        return this.sendRequest("disableProxyMapping", { "mappingid": mappingId })
    }

    /**
     * Method removeProxyMapping allows to remove the selected configured of proxy mappings. The method is called by using the MapingId parameter, which represents the id of the configured proxy connection. In the Response field the status of completion of operation of removing the mapping is displayed.
     * @param {string} mappingId 
     * @returns {Promise<string>} Promise
     */

    removeProxyMapping(mappingId) {
        mappingId = mappingId || "";
        return this.sendRequest("removeProxyMapping", { "mappingId": mappingId })
    }

    /**
     * Method lowTrafficMode returns in Response block the status of low Traffic mode. The method is called without using any parameters. 
     * @returns {Promise<string>} Promise
     */

    lowTrafficMode() {
        return this.sendRequest("lowTrafficMode")
    }

    /**
     * Method setLowTrafficMode allows to turn on or off the low Traffic mode. The method is called by using the enabled parameter, which represents itself a status of true or false that is being set for this particular mode. 
     * @param {string} enabled
     * @returns {Promise<string>} Promise
     */

    setLowTrafficMode(enabled) {
        enabled = enabled || "";
        return this.sendRequest("setLowTrafficMode", { "enavled": enabled })
    }

    /**
     * Method getWhoIsInfo returns in Response block the detailed information about selected user. As a parameter of the method, the Public key of the particular user can be used, or his nickname, if such contact was added to the contact list. 
     * @param {string} nameOrPk uNS name or Public Key to lookup
     * @returns {Promise<string>} Promise
     */

    getWhoIsInfo(nameOrPk) {
        nameOrPk = nameOrPk || "";
        return this.sendRequest("getWhoIsInfo", { "owner": nameOrPk })
    }

    /**
     * Method requestTreasuryInterestRates makes request to obtain treasury interest rate data
     * @returns {Promise<string>} Promise
     */

    requestTreasuryInterestRates() {
        return this.sendRequest("requestTreasuryInterestRates")
    }

    /**
     * Method getTreasuryInterestRates returns in Response block the detailed information about threasury interest rate
     * @returns {Promise<string>} Promise
     */

    getTreasuryInterestRates() {
        return this.sendRequest("getTreasuryInterestRates")
    }

    /**
     * Method requestTreasuryTransactionVolumes makes request to obtain treasury transaction volume data
     * @returns {Promise<string>} Promise
     */

    requestTreasuryTransactionVolumes() {
        return this.sendRequest("requestTreasuryTransactionVolumes")
    }

    /**
     * Method getTreasuryTransactionVolumes returns in Response block the detailed information about threasury transaction volume
     * @returns {Promise<string>} Promise
     */

    getTreasuryTransactionVolumes() {
        return this.sendRequest("getTreasuryTransactionVolumes")
    }

    /**
     * Method ucodeEncode returns image of ucode in sizeImage with public key from hexCode
     * @param {string} hexCode Public Key
     * @param {string} sizeImage Image size in pixels
     * @param {string} coder BASE64 | HEX
     * @param {string} format PNG | JPG
     * @returns {Promise<string>} Promise
     */

    ucodeEncode(hexCode, sizeImage, coder, format) {
        hexCode = hexCode || "";
        sizeImage = sizeImage || "256";
        coder = coder || "BASE64";
        format = format || "PNG";
        return this.sendRequest("ucodeEncode", {
            "hex_code": hexCode, "size_image": sizeImage, "coder": coder,
            "format": format
        })
    }

    /**
     * Method ucodeDecode returns hex public key from image in base64 format.
     * @param {string} base64Image Image in Base64 format
     * @returns {Promise<string>} Promise
     */

    ucodeDecode(base64Image) {
        return this.sendRequest("ucodeDecode", { "base64_image": base64Image })
    }

    /**
     * Method getWebSocketState returns WSS Notifications state, 0 - disabled or active listening port number.
     * @returns {Promise<string>} Promise
     */

    getWebSocketState() {
        return this.sendRequest("getWebSocketState")
    }

    /**
     * Method setWebSocketState set WSS Notification state.
     * @returns {Promise<string>} Promise
     */

    setWebSocketState(enabled, port) {
        return this.sendRequest("setWebSocketState", { "enabled": enabled, "port": port })
    }
}

module.exports = Utopia;