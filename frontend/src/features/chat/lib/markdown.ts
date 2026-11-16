const BLOCK = /\n|^\s*([-*+] |\d+[.)] |#{1,6} |>|```|\|)/

/** True when the text is more than plain running text, so it needs block layout. */
export const hasBlocks = (text: string) => BLOCK.test(text)
