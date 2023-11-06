"use strict";

import { Message } from "../../Core/MessageBus.js"
import * as Tools from "../../Core/Tools.js";

export class Navigation
{
    #i18nRef;
    #htmlElem;
    #htmlBackBtn;

    constructor(i18nRef, messageBusRef)
    {
        this.#i18nRef = i18nRef;
        messageBusRef.add(this.#onMessage.bind(this));
    }

    async init(htmlNavRef, configRef)
    {
        this.#htmlElem    = htmlNavRef;
        this.#htmlBackBtn = Tools.getHTMLElementsByClassName("defaultButton", this.#htmlElem)[0];
        this.#htmlBackBtn.addEventListener("click", () => { window.location.href = configRef.backBtnLink; });
    }

    #onMessage(message, data)
    {
        if (message === Message.languageChanged)
        {
            this.#htmlBackBtn.innerHTML = this.#i18nRef.get("nav-backBtn");
            
            let insertLeftArrows = Tools.getHTMLElementsByClassName("insert-leftArrow", this.#htmlBackBtn, false);
            if (insertLeftArrows.length > 0) { // make left-arrow optional
                insertLeftArrows[0].innerHTML = `
                    <svg class="centerSymbol" width="20" height="20">
                        <use xlink:href="#leftArrow-symbol" />
                    </svg>  
                `;
            }
        }
    }
}