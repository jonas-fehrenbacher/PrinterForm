"use strict";

import * as Tools from "../../Core/Tools.js";

export class ErrorMessageBox
{
    #i18nRef;
    #htmlElem;
    #htmlCacheRef;

    constructor(i18nRef, htmlCacheRef)
    {
        this.#htmlCacheRef = htmlCacheRef;
        this.#i18nRef      = i18nRef;
        this.#htmlElem     = {};
    }

    async init(htmlForm)
    {
        this.#htmlElem = Tools.getHTMLElementsByClassName("errorMessageBoxes", htmlForm)[0];
    }

    push(text)
    {
        let newItem = Tools.getHTMLElementByString(this.#htmlCacheRef.get("ErrorMessage"), Tools.HTMLElementSearchType.class, "errorMessageBox"); // this.#errorMessageTemplate.cloneNode(true); // true: clone all children (deep copy)
        Tools.getHTMLElementsByClassName("errorMessageBox-label", newItem)[0].textContent = this.#i18nRef.get("errorMessageBox-label") + ": ";
        Tools.getHTMLElementsByClassName("errorMessageBox-text", newItem)[0].textContent  = text;
        this.#htmlElem.appendChild(newItem);
    }

    clear()
    {
        this.#htmlElem.innerHTML = "";
    }
}