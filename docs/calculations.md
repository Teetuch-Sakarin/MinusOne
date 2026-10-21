# Calculation contract

The launch market is Thailand and the default currency is THB, as confirmed for this MVP. These constants are demonstration assumptions, not official tariff or engineering data. Users can edit them before selecting a supplier.

| Assumption            | Default            | Source/status                                             |
| --------------------- | ------------------ | --------------------------------------------------------- |
| Import tariff         | THB 4.50/kWh       | Illustrative editable assumption                          |
| Export tariff         | THB 0/kWh          | Conservative default; no export entitlement assumed       |
| Annual yield          | 1,400 kWh/kWp      | Illustrative editable assumption                          |
| Capital cost          | THB 32,000/kWp     | Illustrative editable assumption                          |
| Roof area requirement | 7 m²/kWp           | Screening assumption; not a roof survey                   |
| Annual maintenance    | 1% of capital cost | Illustrative editable allowance                           |
| Savings range         | ±20%               | Scenario variation, not a statistical confidence interval |

For monthly consumption `E`, daytime share `D`, usable roof area `R`, area requirement `A`, annual yield `Y`, cost/kWp `C`, import tariff `T`, export tariff `X`, and maintenance fraction `M`:

```text
capacity = floor(min(R/A, E*12*D/Y) * 10) / 10
generation = capacity * Y
selfConsumed = min(generation, E*12*D)
exported = max(0, generation - selfConsumed)
capital = capacity * C
maintenance = capital * M
savings = selfConsumed * T + exported * X - maintenance
simplePayback = capital / savings, or null when savings <= 0
```

The floor rounds down to 0.1 kWp to avoid exceeding either limit. A supplier offer uses its quoted generation and price in the same savings calculation; if generation is absent, the comparison shows the yield-based estimate and still marks the quoted generation as missing. Such an incomplete offer cannot be selected.

For the seeded business (620 m², 12,000 kWh/month, 78% daytime share), the preliminary result is **80.2 kWp**, **112,280 kWh/year**, **THB 2,566,400** capital cost, **THB 25,664/year** maintenance, and **THB 479,596/year** indicative savings. Simple payback is about **5.35 years**. This differs from the 80 kWp sample Sunward proposal, whose own 112,000 kWh generation and THB 2,560,000 price imply **THB 478,400/year** savings with the same assumptions.

For a loan with principal `P`, annual nominal rate `i`, and `n` monthly payments:

```text
r = i / 12
payment = P * r / (1 - (1+r)^(-n))
payment = P / n when r == 0
principal = quotedPrice * (1 - depositFraction)
```

The Green Growth sample uses 6.5% p.a., 60 months, and 15% deposit. Solar Flex uses 7.9% p.a., 84 months, and 10% deposit. These are synthetic products. No fees, floating-rate changes, insurance, balloon payments, or real underwriting are included.

Saving a supplier selection preserves the original offer, business inputs, assumptions, calculation output, evidence references, and timestamp. Subsequent performance comparisons use that baseline rather than silently recalculating historical projections. The monthly production baseline is annual generation divided by 12; it is not a seasonal forecast.
