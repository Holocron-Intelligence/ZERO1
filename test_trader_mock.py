import asyncio
import sys
import unittest
from unittest.mock import MagicMock, patch

# Mock out dependencies to run tests
sys.modules['pandas'] = MagicMock()
sys.modules['numpy'] = MagicMock()
sys.modules['src.data.binance'] = MagicMock()
sys.modules['src.api.client'] = MagicMock()
sys.modules['src.risk.manager'] = MagicMock()
sys.modules['src.dashboard.app'] = MagicMock()
sys.modules['src.strategy.signals'] = MagicMock()
sys.modules['src.strategy.regime'] = MagicMock()
sys.modules['src.heatmap.engine'] = MagicMock()
sys.modules['src.data.candles'] = MagicMock()
sys.modules['src.indicators.core'] = MagicMock()

from src.live.trader import LiveTrader, MMSymbolState
from src.config import Config

class TestTrader(unittest.IsolatedAsyncioTestCase):
    async def test_execute_fill(self):
        config_mock = MagicMock()
        config_mock.fees.maker_fee_pct = 0.1

        bot = LiveTrader(config_mock)
        bot.balance = 1000.0
        bot.mm_states['BTC/USD'] = MMSymbolState()

        # Call _execute_fill
        bot._execute_fill('BTC/USD', 'BUY', 50000, 1.0)

        state = bot.mm_states['BTC/USD']

        # Check that fee was calculated correctly (size * price * fee_pct)
        # fee = 1.0 * 50000 * (0.1 / 100) = 50.0
        self.assertEqual(state.fees_paid, 50.0)

        # Check that balance updated
        self.assertEqual(bot.balance, 950.0)

        # Check that inventory updated
        self.assertEqual(state.inventory, 1.0)

if __name__ == '__main__':
    unittest.main()
