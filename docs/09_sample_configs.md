# Goblin Cartel: примеры конфигов

**Версия:** 0.1  
**Дата:** 2026-04-28

## 1. Resource config

```json
{
  "resources": [
    {
      "id": "gold",
      "nameKey": "resource.gold.name",
      "iconAssetId": "icon_gold_v1",
      "rarity": "common",
      "storageType": "global",
      "sortOrder": 10
    },
    {
      "id": "stone",
      "nameKey": "resource.stone.name",
      "iconAssetId": "icon_stone_v1",
      "rarity": "common",
      "storageType": "global",
      "sortOrder": 20
    },
    {
      "id": "copper_ore",
      "nameKey": "resource.copper_ore.name",
      "iconAssetId": "icon_copper_ore_v1",
      "rarity": "common",
      "storageType": "global",
      "sortOrder": 30
    }
  ]
}
```

## 2. Block type config

```json
{
  "blockTypes": [
    {
      "id": "dirt",
      "nameKey": "block.dirt.name",
      "baseHp": 20,
      "tags": ["soft"],
      "visualStateAssets": {
        "intact": "block_dirt_intact_v1",
        "cracked": "block_dirt_cracked_v1",
        "breaking": "block_dirt_breaking_v1"
      },
      "rewardTable": [
        { "resourceId": "stone", "min": 1, "max": 3, "chance": 1.0 },
        { "resourceId": "gold", "min": 1, "max": 5, "chance": 0.05 }
      ],
      "specialBehavior": "none"
    },
    {
      "id": "stone",
      "nameKey": "block.stone.name",
      "baseHp": 60,
      "tags": ["rock"],
      "visualStateAssets": {
        "intact": "block_stone_intact_v1",
        "cracked": "block_stone_cracked_v1",
        "breaking": "block_stone_breaking_v1"
      },
      "rewardTable": [
        { "resourceId": "stone", "min": 3, "max": 8, "chance": 1.0 }
      ],
      "specialBehavior": "none"
    },
    {
      "id": "copper_ore",
      "nameKey": "block.copper_ore.name",
      "baseHp": 120,
      "tags": ["rock", "ore", "copper"],
      "visualStateAssets": {
        "intact": "block_copper_ore_intact_v1",
        "cracked": "block_copper_ore_cracked_v1",
        "breaking": "block_copper_ore_breaking_v1"
      },
      "rewardTable": [
        { "resourceId": "copper_ore", "min": 4, "max": 12, "chance": 1.0 },
        { "resourceId": "gold", "min": 5, "max": 15, "chance": 0.1 }
      ],
      "specialBehavior": "none"
    }
  ]
}
```

## 3. Mine template config

```json
{
  "mineTemplates": [
    {
      "id": "old_well_01",
      "displayNameKey": "mine.old_well.name",
      "width": 8,
      "height": 12,
      "depthMeters": 60,
      "difficulty": 1,
      "seedMode": "playerBased",
      "unlockRequirements": [],
      "strata": [
        {
          "id": "top_soil",
          "fromRow": 0,
          "toRow": 3,
          "blockWeights": {
            "dirt": 70,
            "stone": 25,
            "gold": 5
          }
        },
        {
          "id": "stone_layer",
          "fromRow": 4,
          "toRow": 7,
          "blockWeights": {
            "dirt": 20,
            "stone": 60,
            "copper_ore": 15,
            "gold": 5
          }
        },
        {
          "id": "copper_layer",
          "fromRow": 8,
          "toRow": 11,
          "blockWeights": {
            "stone": 55,
            "copper_ore": 35,
            "chest_wooden": 5,
            "gold": 5
          }
        }
      ],
      "guaranteedObjects": [
        {
          "type": "vein",
          "veinTypeId": "copper_vein_small",
          "rowRange": [8, 11],
          "count": 1
        },
        {
          "type": "chest",
          "blockTypeId": "chest_wooden",
          "rowRange": [5, 10],
          "count": 1
        }
      ],
      "completionRewards": [
        { "resourceId": "gold", "amount": 500 },
        { "resourceId": "stone", "amount": 100 }
      ]
    }
  ]
}
```

## 4. Goblin config

```json
{
  "goblins": [
    {
      "id": "gryzz_crooked_tooth",
      "nameKey": "goblin.gryzz.name",
      "descriptionKey": "goblin.gryzz.description",
      "class": "miner",
      "clan": "rusty_picks",
      "rarity": "common",
      "assetId": "goblin_gryzz_v1",
      "baseStats": {
        "strength": 8,
        "speed": 5,
        "luck": 2,
        "loyalty": 5
      },
      "ability": {
        "id": "stone_biter",
        "nameKey": "ability.stone_biter.name",
        "effects": [
          {
            "type": "damage_bonus_by_tag",
            "tag": "rock",
            "value": 0.2
          }
        ]
      },
      "hireCost": [
        { "resourceId": "gold", "amount": 150 }
      ],
      "unlockRequirements": []
    },
    {
      "id": "pip_dry_book",
      "nameKey": "goblin.pip.name",
      "descriptionKey": "goblin.pip.description",
      "class": "collector",
      "clan": "black_pockets",
      "rarity": "rare",
      "assetId": "goblin_pip_v1",
      "baseStats": {
        "strength": 2,
        "speed": 4,
        "luck": 7,
        "loyalty": 8
      },
      "ability": {
        "id": "boring_order",
        "effects": [
          {
            "type": "auto_collect_slots",
            "value": 1
          }
        ]
      },
      "hireCost": [
        { "resourceId": "gold", "amount": 2500 },
        { "resourceId": "copper_ore", "amount": 100 }
      ],
      "unlockRequirements": [
        { "type": "built_mines_count", "value": 2 }
      ]
    }
  ]
}
```

## 5. Built mine config

```json
{
  "builtMineTypes": [
    {
      "id": "small_copper_mine",
      "nameKey": "built_mine.small_copper.name",
      "sourceVeinType": "copper_vein_small",
      "productionResourceId": "copper_ore",
      "baseProductionPerMinute": 12,
      "baseCapacity": 300,
      "buildCost": [
        { "resourceId": "gold", "amount": 500 },
        { "resourceId": "stone", "amount": 120 }
      ],
      "buildTimeSec": 60,
      "upgradeCurveId": "basic_mine_curve_01",
      "mergeGroupId": "copper_mines",
      "assetId": "built_mine_copper_small_v1"
    }
  ]
}
```

## 6. Automation config

```json
{
  "automationNodes": [
    {
      "id": "senior_miner_01",
      "nameKey": "automation.senior_miner.name",
      "descriptionKey": "automation.senior_miner.description",
      "tier": 1,
      "dependsOn": [],
      "unlockRequirements": [
        { "type": "goblins_by_class", "class": "miner", "count": 3 }
      ],
      "cost": [
        { "resourceId": "gold", "amount": 2000 },
        { "resourceId": "copper_ore", "amount": 80 }
      ],
      "effects": [
        {
          "type": "auto_select_next_block",
          "enabled": true
        }
      ],
      "assetId": "automation_senior_miner_v1"
    },
    {
      "id": "collector_01",
      "nameKey": "automation.collector.name",
      "descriptionKey": "automation.collector.description",
      "tier": 2,
      "dependsOn": ["senior_miner_01"],
      "unlockRequirements": [
        { "type": "built_mines_count", "value": 2 }
      ],
      "cost": [
        { "resourceId": "gold", "amount": 5000 }
      ],
      "effects": [
        {
          "type": "auto_collect_slots",
          "value": 1
        }
      ],
      "assetId": "automation_collector_v1"
    }
  ]
}
```

## 7. Recipe config

```json
{
  "recipes": [
    {
      "id": "copper_ore_to_ingot",
      "nameKey": "recipe.copper_ore_to_ingot.name",
      "input": [
        { "resourceId": "copper_ore", "amount": 10 }
      ],
      "output": [
        { "resourceId": "copper_ingot", "amount": 1 }
      ],
      "durationSec": 30,
      "buildingRequirement": "smelter_01",
      "unlockRequirements": [
        { "type": "mine_completed", "mineTemplateId": "old_well_01" }
      ]
    }
  ]
}
```

## 8. Economy curve config

```json
{
  "curves": [
    {
      "id": "basic_mine_upgrade_curve_01",
      "type": "exponential",
      "baseCostMultiplier": 1.35,
      "productionMultiplierPerLevel": 1.18,
      "capacityMultiplierPerLevel": 1.12,
      "maxLevel": 20
    },
    {
      "id": "goblin_level_curve_01",
      "type": "power",
      "baseCost": 100,
      "power": 1.45,
      "maxLevel": 20
    }
  ]
}
```

## 9. Feature flags config

```json
{
  "featureFlags": {
    "enableTelemetry": true,
    "enableRemoteConfig": true,
    "enableProduction": true,
    "enableEvents": false,
    "enableClans": false,
    "enableTerritories": false,
    "enableRuStorePayments": false,
    "enablePushNotifications": false
  }
}
```

## 10. Localisation example

```json
{
  "resource.gold.name": "Золото",
  "resource.stone.name": "Камень",
  "resource.copper_ore.name": "Медная руда",

  "mine.old_well.name": "Старый колодец",

  "goblin.gryzz.name": "Грызз Кривозуб",
  "goblin.gryzz.description": "Долбит камни так уверенно, будто камни ему должны.",

  "automation.senior_miner.name": "Старший шахтёр",
  "automation.senior_miner.description": "Гоблины сами выбирают следующий блок. Чудо организации, почти цивилизация."
}
```
