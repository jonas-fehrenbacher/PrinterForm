"use strict";

/**
 * Expects all State classes to have the methods 'startState' and 'stopState'.
 */
export class StateMachine
{
    #current;

    constructor()
    {
        this.#current = null;
    }

    change(state)
    {
        if (this.#current) {
            this.#current.stopState();
        }
        state.startState();
        this.#current = state;
    }
}