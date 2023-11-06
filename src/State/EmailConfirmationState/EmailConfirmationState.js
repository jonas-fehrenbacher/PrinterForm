"use strict";

import * as Tools from "../../Core/Tools.js";
import { Message } from "../../Core/MessageBus.js"

/**
 * see: https://www.w3schools.com/howto/howto_css_modals.asp
 */
export class EmailConfirmationState
{
    #i18nRef;
    #htmlStateRef;
    #messageBusRef;
    #htmlElem;
    #htmlTitle;
    #htmlText;
    #htmlButton;

    constructor(i18nRef, messageBusRef, htmlStateRef)
    {
        this.#messageBusRef = messageBusRef;
        this.#htmlStateRef  = htmlStateRef;
        this.#i18nRef       = i18nRef;
        this.#htmlElem      = {};
        this.#htmlTitle     = {};
        this.#htmlText      = {};
        this.#htmlButton    = {};

        messageBusRef.add(this.#onMessage.bind(this));
    }

    async init(htmlCache)
    {
        this.#htmlElem   = Tools.getHTMLElementByString(htmlCache.get("EmailConfirmationState"), Tools.HTMLElementSearchType.class, "emailConfirmationState");
        this.#htmlTitle  = Tools.getHTMLElementsByClassName("emailConfirmationBox-title", this.#htmlElem)[0];
        this.#htmlText   = Tools.getHTMLElementsByClassName("emailConfirmationBox-text", this.#htmlElem)[0];
        this.#htmlButton = Tools.getHTMLElementsByClassName("defaultButton", this.#htmlElem)[0];

        this.#htmlButton.addEventListener("click", this.#onClick.bind(this));
    }

    startState()
    {
        this.#htmlStateRef.appendChild(this.#htmlElem);
    }

    stopState()
    {
        this.#htmlStateRef.removeChild(this.#htmlElem);
    }

    #onClick()
    {
        this.#messageBusRef.send(Message.emailConfirmationClosed);
    }

    #onMessage(message, data)
    {
        if (message === Message.languageChanged)
        {
            this.#htmlTitle.textContent  = this.#i18nRef.get("emailConfirmationBox-title");
            this.#htmlText.textContent   = this.#i18nRef.get("emailConfirmationBox-text");
            this.#htmlButton.textContent = this.#i18nRef.get("emailConfirmationBox-button");
        }
    }
}