"""The estimated cost of an answer, from its token counts and the model's list price."""


def calculate_cost(
    tokens_in: int,
    tokens_out: int,
    price_in: float | None,
    price_out: float | None,
) -> float | None:
    """US dollars for one answer. Prices are dollars per token, as OpenRouter lists them.

    None when either price is unknown: an estimate must not pretend to be a number."""
    if price_in is None or price_out is None:
        return None
    return round(tokens_in * price_in + tokens_out * price_out, 6)
