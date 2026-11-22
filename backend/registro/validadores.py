def clabe_valida(clabe: str) -> bool:
    """N22: la CLABE tiene 18 dígitos y el último es un dígito de control (pesos 3-7-1)."""
    if len(clabe) != 18 or not clabe.isdigit():
        return False
    pesos = [3, 7, 1] * 6
    suma = sum((int(d) * p) % 10 for d, p in zip(clabe[:17], pesos))
    return int(clabe[17]) == (10 - suma % 10) % 10
