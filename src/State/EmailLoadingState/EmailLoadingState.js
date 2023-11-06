"use strict";

import { Message } from "../../Core/MessageBus.js"
import * as Tools from "../../Core/Tools.js";

/**
 * see: https://www.w3schools.com/howto/howto_css_modals.asp
 */
export class EmailLoadingState
{
    #i18nRef;
    #htmlStateRef;
    #messageBusRef;
    #htmlElem;
    #htmlProgressBar;
    #htmlPercentage;
    #isFinished; /* user can set this to true, so that progress bar can finish. */
    #htmlMessage;
    #width; // Width needs to be here and not in 'startLoadingAnimation', because there is a bug: "If you submit two forms really fast after each other, then width is directly >= 100 and the second LoadingBar ends, directly. Afterwards this error stays - even if expectedDuration is 15sec. Btw Message.endSendingEmail is called normally."

    constructor(i18nRef, messageBusRef, htmlStateRef)
    {
        this.#messageBusRef   = messageBusRef;
        this.#htmlStateRef    = htmlStateRef;
        this.#i18nRef         = i18nRef;
        this.#htmlElem        = {};
        this.#htmlProgressBar = {};
        this.#htmlPercentage  = {};
        this.#htmlMessage     = {};
        this.#isFinished      = false;
        this.#width           = 0;

        messageBusRef.add(this.#onMessage.bind(this));

        // Do not call 'this.init();' here, but in main.js before the language is loaded. Otherwise language file could be loaded before this is loaded. 
    }

    async init(htmlCacheRef)
    {
        this.#htmlElem        = Tools.getHTMLElementByString(htmlCacheRef.get("EmailLoadingState"), Tools.HTMLElementSearchType.class, "emailLoadingState");
        this.#htmlProgressBar = Tools.getHTMLElementsByClassName("emailLoadingBox-progressBar-progress", this.#htmlElem)[0];
        this.#htmlPercentage  = Tools.getHTMLElementsByClassName("emailLoadingBox-percentage", this.#htmlElem)[0];
        this.#htmlMessage     = Tools.getHTMLElementsByClassName("emailLoadingBox-message", this.#htmlElem)[0];
    }

    startState()
    {
        this.#htmlStateRef.appendChild(this.#htmlElem);
    }

    stopState()
    {
        this.#htmlStateRef.removeChild(this.#htmlElem);
    }

    startLoadingAnimation(durationInSec)
    {
        // Loop:
        // setInterval()::milliseconds: If the value is less than 10, 10 is used
        let speed = durationInSec === 0 ? 3 : 1; // If it is 0, then there are no attachments. Use this because setInterval() can not be called less than every 10ms.
        let durationInMS = durationInSec * 1000;
        let intervalID = setInterval(() => {
            if (this.#width >= 100) {
                // ..stop
                // or stop it manually?
                clearInterval(intervalID);
                this.#width = 0;
                this.#htmlProgressBar.style.width = this.#width + '%';
                this.#htmlPercentage.textContent = this.#width + ' %';
                this.#isFinished = false;
                this.#messageBusRef.send(Message.emailLoadingFinished); // for 'ConfirmationBox'
            }
            else {
                // ..still running
                if (this.#isFinished && this.#width <= 99) {
                    this.#width = 100;
                }
                else if (!this.#isFinished && this.#width == 99) {
                    // ..progress bar is to fast. Do nothing, wait for 'finish()' being called.
                }
                else {
                    this.#width += speed;
                }
                this.#htmlProgressBar.style.width = this.#width + '%';
                this.#htmlPercentage.textContent = this.#width + ' %';
            }
        }, durationInMS / 100); /* Call this function 100 times in a span of 'durationInMS'. */
    }

    #onMessage(message, data)
    {
        if (message === Message.languageChanged)
        {
            this.#htmlMessage.textContent = this.#i18nRef.get("emailLoadingBox-message");
        }

        if (message === Message.endSendingEmail)
        {
            this.#isFinished = true;
        }
    }
}