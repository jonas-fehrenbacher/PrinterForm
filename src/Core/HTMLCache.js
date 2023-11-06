"use strict";

export class HTMLCache
{
    #resources;

    constructor()
    {
        this.#resources = new Map();
    }

    async add(id, resourceFilepath)
    {
        const response = await fetch(resourceFilepath);
        const htmlStr  = await response.text();
        this.#resources.set(id, htmlStr);
    }

    remove(id)
    {
        this.#resources.delete(id);
    }

    clear()
    {
        this.#resources.clear();
    }

    get(id)
    {
        return this.#resources.get(id);
    }
}