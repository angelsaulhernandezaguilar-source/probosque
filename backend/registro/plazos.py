from datetime import timedelta


def sumar_dias_habiles(fecha, dias):
    """Suma días hábiles (lunes a viernes) a una fecha.
    No descuenta días festivos: el calendario oficial queda por definir."""
    while dias > 0:
        fecha += timedelta(days=1)
        if fecha.weekday() < 5:  # 0 = lunes ... 4 = viernes
            dias -= 1
    return fecha
