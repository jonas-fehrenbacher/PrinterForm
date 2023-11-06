"use strict";

export var Message = {
    languageChanged:         "languageChanged",
    emailIsBeingPrepared:    "emailIsBeingPrepared",
    startSendingEmail:       "startSendingEmail",
    endSendingEmail:         "endSendingEmail",
    emailLoadingFinished:    "emailLoadingFinished",
    emailConfirmationClosed: "emailConfirmationClosed"
}

export class MessageBus
{
    #receivers;

    constructor()
    {
        this.#receivers = [];
    }

    add(receiver)
    {
        this.#receivers.push(receiver);
    }

    send(message, data)
    {
        for (let receiver of this.#receivers) {
            receiver(message, data);
        }
    }
}