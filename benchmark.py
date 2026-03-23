import time
import pandas as pd
import numpy as np

# Mock implementation of current logic
def detect_divergence_current(
    price: pd.Series,
    indicator: pd.Series,
    lookback: int = 14,
    min_swing: float = 0.001,
) -> pd.Series:
    result = pd.Series(0, index=price.index, dtype=float)

    if len(price) < lookback * 2:
        return result.rename("divergence")

    # Rolling highs and lows
    price_roll_high = price.rolling(lookback).max()
    price_roll_low = price.rolling(lookback).min()
    ind_roll_high = indicator.rolling(lookback).max()
    ind_roll_low = indicator.rolling(lookback).min()

    # Previous window highs/lows
    price_prev_high = price.shift(lookback).rolling(lookback).max()
    price_prev_low = price.shift(lookback).rolling(lookback).min()
    ind_prev_high = indicator.shift(lookback).rolling(lookback).max()
    ind_prev_low = indicator.shift(lookback).rolling(lookback).min()

    # Bearish divergence: price higher high BUT indicator lower high
    bearish = (
        (price_roll_high > price_prev_high * (1 + min_swing)) &
        (ind_roll_high < ind_prev_high * (1 - min_swing))
    )

    # Bullish divergence: price lower low BUT indicator higher low
    bullish = (
        (price_roll_low < price_prev_low * (1 - min_swing)) &
        (ind_roll_low > ind_prev_low * (1 + min_swing))
    )

    result = result.where(~bearish, -1)
    result = result.where(~bullish, 1)

    return result.rename("divergence")

# Optimized implementation
def detect_divergence_optimized(
    price: pd.Series,
    indicator: pd.Series,
    lookback: int = 14,
    min_swing: float = 0.001,
) -> pd.Series:
    result = pd.Series(0, index=price.index, dtype=float)

    if len(price) < lookback * 2:
        return result.rename("divergence")

    # Rolling highs and lows
    price_roll_high = price.rolling(lookback).max()
    price_roll_low = price.rolling(lookback).min()
    ind_roll_high = indicator.rolling(lookback).max()
    ind_roll_low = indicator.rolling(lookback).min()

    # Previous window highs/lows
    # We can just shift the already computed rolling highs and lows!
    price_prev_high = price_roll_high.shift(lookback)
    price_prev_low = price_roll_low.shift(lookback)
    ind_prev_high = ind_roll_high.shift(lookback)
    ind_prev_low = ind_roll_low.shift(lookback)

    # Bearish divergence: price higher high BUT indicator lower high
    bearish = (
        (price_roll_high > price_prev_high * (1 + min_swing)) &
        (ind_roll_high < ind_prev_high * (1 - min_swing))
    )

    # Bullish divergence: price lower low BUT indicator higher low
    bullish = (
        (price_roll_low < price_prev_low * (1 - min_swing)) &
        (ind_roll_low > ind_prev_low * (1 + min_swing))
    )

    result = result.where(~bearish, -1)
    result = result.where(~bullish, 1)

    return result.rename("divergence")


np.random.seed(42)
N = 1000000
price = pd.Series(np.random.randn(N).cumsum())
indicator = pd.Series(np.random.randn(N).cumsum())

# Test correctness
res1 = detect_divergence_current(price, indicator)
res2 = detect_divergence_optimized(price, indicator)

if not res1.equals(res2):
    print("WARNING: Results differ between current and optimized")
else:
    print("Correctness check passed.")

# Benchmark current
start = time.time()
for _ in range(10):
    detect_divergence_current(price, indicator)
t_current = time.time() - start

# Benchmark optimized
start = time.time()
for _ in range(10):
    detect_divergence_optimized(price, indicator)
t_opt = time.time() - start

print(f"Current time:   {t_current:.4f} seconds")
print(f"Optimized time: {t_opt:.4f} seconds")
print(f"Speedup:        {t_current/t_opt:.2f}x")
