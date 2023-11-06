"use strict";

import { assert } from "./Tools.js"

export class I18n
{
    #properties;
    #isLoaded;

    constructor()
    {
        this.#properties = {};
        this.#isLoaded   = false;
    }

    async load(language)
    {
        assert(typeof language === "string" && language != "");

        this.#isLoaded = false; // START loading

        const response   = await fetch("assets/i18n.json");
        const json       = await response.json(); // does already 'JSON.parse(json);'
        this.#properties = json[language];

        this.#isLoaded = true; // END loading
    }

    /**
     * @param id ID of the text / property
     * @return stored text from i18n.json for the handed ID.
     */
    get(id) 
    {
        //assert(this.#properties.hasOwnProperty(id)); // Not necessary, I just return nothing.
        return this.#isLoaded ? this.#properties[id] : "";
    }

    /**
     * 
     * @returns true if everything is loaded.
     */
    isLoaded()
    {
        return this.#isLoaded;
    }
}