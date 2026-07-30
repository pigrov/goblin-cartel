import type { ContentBundle, ContentRecord } from "../../../api/adminApi";
import { ContentAssetUploadField } from "../ContentAssetUploadField";
import { ContentNestedSection, ContentTextField } from "../formFields";
import {
  arrayField,
  formValue,
  localizationValue,
  numberField,
  numberString,
  parseJsonRecordArray,
  recordAt,
  recordField,
  resourceAmountField,
  stringField,
  stringFieldAtPath,
  toInteger,
  type EntityFormState
} from "../formState";

export const goblinRoleOptions = [
  { value: "miner", label: "Шахтер", statKey: "power", statLabel: "Сила" },
  { value: "collector", label: "Сборщик", statKey: "speed", statLabel: "Скорость" },
  { value: "foreman", label: "Бригадир", statKey: "control", statLabel: "Контроль" }
] as const;

type AdminGoblinRole = (typeof goblinRoleOptions)[number]["value"];
type GoblinRoleOption = (typeof goblinRoleOptions)[number];

const ownedGoblinSkinFields = [
  { field: "skinOwnedCardBase", label: "Подложка личного гоблина", path: ["ownedCards", "base"], defaultAssetId: "ui_owned_goblin_card_base_v1" },
  {
    field: "skinOwnedUpgradeArrow",
    label: "Стрелка доступного апгрейда",
    path: ["ownedCards", "upgradeArrow"],
    defaultAssetId: "ui_owned_goblin_upgrade_arrow_v1"
  },
  {
    field: "skinOwnedStarIcon",
    label: "Иконка звезды",
    path: ["ownedCards", "starIcon"],
    defaultAssetId: "",
    required: false
  }
] as const;

const hireCardSkinFields = [
  { field: "skinTitlePlate", label: "Плашка заголовка", path: ["titlePlate"], defaultAssetId: "ui_hire_title_plate_v1" },
  { field: "skinCardBase", label: "Подложка карточки", path: ["cardBase"], defaultAssetId: "ui_hire_card_base_common_v1" },
  { field: "skinButtonNormal", label: "Кнопка normal", path: ["buttons", "normal"], defaultAssetId: "ui_hire_button_normal_v1" },
  { field: "skinButtonHover", label: "Кнопка hover", path: ["buttons", "hover"], defaultAssetId: "ui_hire_button_hover_v1" },
  { field: "skinButtonPressed", label: "Кнопка pressed", path: ["buttons", "pressed"], defaultAssetId: "ui_hire_button_pressed_v1" },
  { field: "skinButtonDisabled", label: "Кнопка disabled", path: ["buttons", "disabled"], defaultAssetId: "ui_hire_button_disabled_v1" }
] as const;

const goblinUiSkinFields = [...ownedGoblinSkinFields, ...hireCardSkinFields] as const;

export function ContentGoblinsFields(props: {
  formState: EntityFormState;
  sessionToken: string | null;
  updateField: (field: string, value: string) => void;
  updateFields: (values: EntityFormState) => void;
}) {
  return (
    <>
      <ContentTextField disabled label="ID" name="id" onChange={props.updateField} value={props.formState.id} />
      <ContentTextField label="Название RU" name="title" onChange={props.updateField} value={props.formState.title} />
      <ContentGoblinHireCardSkinFields
        formState={props.formState}
        sessionToken={props.sessionToken}
        updateField={props.updateField}
        updateFields={props.updateFields}
      />
      <ContentGoblinsRoleRows formState={props.formState} sessionToken={props.sessionToken} updateFields={props.updateFields} />
    </>
  );
}

function ContentGoblinHireCardSkinFields(props: {
  formState: EntityFormState;
  sessionToken: string | null;
  updateField: (field: string, value: string) => void;
  updateFields: (values: EntityFormState) => void;
}) {
  const renderSkinField = (item: (typeof goblinUiSkinFields)[number]) => {
    const value = formValue(props.formState, item.field) || item.defaultAssetId;

    return (
      <div className="content-list-row content-list-row-wide" key={item.field}>
        <ContentTextField label={item.label} name={item.field} onChange={props.updateField} value={value} />
        <ContentAssetUploadField
          assetId={value}
          label={item.label}
          onAssetIdChange={(assetId) => props.updateField(item.field, assetId)}
          token={props.sessionToken}
          uploadLabel="Загрузить PNG"
        />
      </div>
    );
  };

  return (
    <>
      <ContentNestedSection
        addLabel="Заполнить дефолтами"
        onAdd={() => props.updateFields(Object.fromEntries(ownedGoblinSkinFields.map((item) => [item.field, item.defaultAssetId])))}
        title="UI личных гоблинов"
      >
        <p className="content-form-note">
          Эти Asset ID управляют подложкой личного гоблина, стрелкой доступного улучшения и иконкой звезд. Если иконка звезды пустая,
          игра покажет стандартную звездочку.
        </p>
        <div className="content-form-grid content-hire-card-skin-grid">{ownedGoblinSkinFields.map(renderSkinField)}</div>
      </ContentNestedSection>

      <ContentNestedSection
        addLabel="Заполнить дефолтами"
        onAdd={() => props.updateFields(Object.fromEntries(hireCardSkinFields.map((item) => [item.field, item.defaultAssetId])))}
        title="UI карточки найма"
      >
        <p className="content-form-note">
          Эти Asset ID управляют визуальным скином карточек найма. PNG можно заменить загрузкой файла в нужный слот; игра берет картинки
          через `/api/assets`.
        </p>
        <div className="content-form-grid content-hire-card-skin-grid">{hireCardSkinFields.map(renderSkinField)}</div>
      </ContentNestedSection>
    </>
  );
}

function ContentGoblinsRoleRows(props: {
  formState: EntityFormState;
  sessionToken: string | null;
  updateFields: (values: EntityFormState) => void;
}) {
  const parsed = parseJsonRecordArray(formValue(props.formState, "rolesJson"));
  const roles = parsed.ok ? normalizeGoblinRoles(parsed.value) : createDefaultGoblinRoles();

  function writeRoles(next: ContentRecord[]) {
    props.updateFields({ rolesJson: JSON.stringify(normalizeGoblinRoles(next), null, 2) });
  }

  function updateRole(index: number, patch: ContentRecord) {
    const next = [...roles];
    next[index] = {
      ...(next[index] ?? {}),
      ...patch
    };
    writeRoles(next);
  }

  function updateHireCost(index: number, value: string) {
    const amount = toInteger(value);
    updateRole(index, { hireCost: amount > 0 ? [{ amount, resourceId: "gold" }] : [] });
  }

  function updateLevelUpgradeCost(index: number, levelIndex: number, value: string) {
    updateStar(index, levelIndex, 5, "upgradeCost", value);
  }

  function updateStar(index: number, levelIndex: number, starIndex: number, field: "statValue" | "upgradeCost", value: string) {
    const role = roles[index] ?? {};
    const levels = [...arrayField(role, "levels")];
    const level = {
      ...recordAt(levels, levelIndex)
    };
    const stars = [...arrayField(level, "stars")];
    const star: ContentRecord = {
      ...recordAt(stars, starIndex),
      stars: starIndex
    };

    if (field === "statValue") {
      star.statValue = toInteger(value);
    } else {
      const amount = toInteger(value);
      star.upgradeCost = starIndex === 5 && amount > 0 ? [{ amount, resourceId: "gold" }] : [];
    }

    stars[starIndex] = star;
    level.stars = stars;
    levels[levelIndex] = level;
    updateRole(index, { levels });
  }

  function addLevel(index: number) {
    const role = roles[index] ?? {};
    const levels = [...arrayField(role, "levels")];
    const previousLevel = recordAt(levels, levels.length - 1);
    const previousStars = arrayField(previousLevel, "stars");
    const previousStat = numberField(recordAt(previousStars, previousStars.length - 1), "statValue", 5);
    const nextLevel = levels.length + 1;
    levels.push(createGoblinRoleLevel(nextLevel, previousStat + 2, 250 * nextLevel * nextLevel));
    updateRole(index, { levels });
  }

  if (!parsed.ok) {
    return (
      <ContentNestedSection title="Роли гоблинов">
        <p className="content-form-note">JSON ролей сейчас невалидный. Пересоздай роли дефолтом или исправь draft.</p>
        <button onClick={() => writeRoles(createDefaultGoblinRoles())} type="button">
          Пересоздать роли
        </button>
      </ContentNestedSection>
    );
  }

  return (
    <ContentNestedSection title="Роли гоблинов">
      {roles.map((role, index) => {
        const roleId = stringField(role, "role") as AdminGoblinRole;
        const roleOption = goblinRoleOption(roleId);
        const levels = arrayField(role, "levels");
        const hireCost = resourceAmountField(arrayField(role, "hireCost"), "gold");
        const visualAssetIds = [stringField(role, "assetId"), stringField(role, "hireAssetId"), stringField(role, "detailsAssetId")].filter(Boolean);
        const hasDuplicateVisualAssetIds = new Set(visualAssetIds).size < visualAssetIds.length;

        return (
          <div className="content-list-row content-list-row-wide content-goblins-role" key={roleOption.value}>
            <div className="content-form-grid">
              <ContentTextField disabled label="ID" name={`goblinRoleId_${index}`} onChange={() => undefined} value={stringField(role, "id") || roleOption.value} />
              <ContentTextField disabled label="Роль" name={`goblinRole_${index}`} onChange={() => undefined} value={roleOption.label} />
              <ContentTextField
                label="Asset ID: маленькая карточка"
                name={`goblinRoleAsset_${index}`}
                onChange={(_, value) => updateRole(index, { assetId: value })}
                value={stringField(role, "assetId")}
              />
              <ContentTextField
                label="Asset ID: найм"
                name={`goblinRoleHireAsset_${index}`}
                onChange={(_, value) => updateRole(index, { hireAssetId: value })}
                value={stringField(role, "hireAssetId")}
              />
              <ContentTextField
                label="Asset ID: попап"
                name={`goblinRoleDetailsAsset_${index}`}
                onChange={(_, value) => updateRole(index, { detailsAssetId: value })}
                value={stringField(role, "detailsAssetId")}
              />
              <ContentTextField
                disabled
                label="Основной стат"
                name={`goblinRoleStatKey_${index}`}
                onChange={() => undefined}
                value={`${roleOption.statLabel} · ${roleOption.statKey}`}
              />
              <ContentAssetUploadField
                assetId={stringField(role, "assetId")}
                label={`${roleOption.label}: маленькая карточка`}
                onAssetIdChange={(assetId) => updateRole(index, { assetId })}
                token={props.sessionToken}
                uploadLabel="Загрузить PNG"
              />
              <ContentAssetUploadField
                assetId={stringField(role, "hireAssetId")}
                label={`${roleOption.label}: картинка найма`}
                onAssetIdChange={(assetId) => updateRole(index, { hireAssetId: assetId })}
                token={props.sessionToken}
                uploadLabel="Загрузить PNG"
              />
              <ContentAssetUploadField
                assetId={stringField(role, "detailsAssetId")}
                label={`${roleOption.label}: картинка попапа`}
                onAssetIdChange={(assetId) => updateRole(index, { detailsAssetId: assetId })}
                token={props.sessionToken}
                uploadLabel="Загрузить PNG"
              />
            </div>
            {hasDuplicateVisualAssetIds ? (
              <p className="content-form-note">
                У маленькой карточки, найма и попапа должны быть разные Asset ID. Иначе загрузка в один слот перезапишет
                остальные картинки.
              </p>
            ) : null}

            <ContentNestedSection addLabel="Добавить уровень" onAdd={() => addLevel(index)} title={`${roleOption.label}: уровни и звезды`}>
              <div className="content-goblins-level-table-wrap">
                <table className="content-goblins-level-table">
                  <thead>
                    <tr>
                      <th>Уровень</th>
                      <th>Найм</th>
                      <th>Улучшение</th>
                      <th>0★</th>
                      <th>1★</th>
                      <th>2★</th>
                      <th>3★</th>
                      <th>4★</th>
                      <th>5★</th>
                    </tr>
                  </thead>
                  <tbody>
                    {levels.map((level, levelIndex) => {
                      const stars = arrayField(level, "stars");
                      const fiveStar = recordAt(stars, 5);
                      const levelNumber = numberField(level, "level", levelIndex + 1);

                      return (
                        <tr key={`${roleOption.value}-${levelNumber}`}>
                          <td>
                            <strong>{levelNumber}</strong>
                          </td>
                          <td>
                            <input
                              aria-label={`${roleOption.label}: найм ${levelNumber} уровня`}
                              disabled={levelIndex > 0}
                              min="0"
                              onChange={(event) => updateHireCost(index, event.target.value)}
                              type="number"
                              value={levelIndex === 0 ? numberString(hireCost) : "0"}
                            />
                          </td>
                          <td>
                            <input
                              aria-label={`${roleOption.label}: улучшение до ${levelNumber + 1} уровня`}
                              disabled={levelIndex >= levels.length - 1}
                              min="0"
                              onChange={(event) => updateLevelUpgradeCost(index, levelIndex, event.target.value)}
                              type="number"
                              value={levelIndex >= levels.length - 1 ? "0" : numberString(resourceAmountField(arrayField(fiveStar, "upgradeCost"), "gold"))}
                            />
                          </td>
                          {Array.from({ length: 6 }, (_, starIndex) => {
                            const star = recordAt(stars, starIndex);

                            return (
                              <td key={`${levelNumber}-${starIndex}`}>
                                <input
                                  aria-label={`${roleOption.label}: ${roleOption.statLabel}, ${levelNumber} уровень, ${starIndex} звезд`}
                                  min="1"
                                  onChange={(event) => updateStar(index, levelIndex, starIndex, "statValue", event.target.value)}
                                  type="number"
                                  value={numberString(numberField(star, "statValue", 5))}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </ContentNestedSection>
          </div>
        );
      })}
    </ContentNestedSection>
  );
}

export function createGoblinsFormState(entity: ContentRecord, content: ContentBundle): EntityFormState {
  const skin = recordField(entity, "skin");

  return {
    id: stringField(entity, "id") || "default",
    rolesJson: JSON.stringify(normalizeGoblinRoles(arrayField(entity, "roles")), null, 2),
    title: localizationValue(content, stringField(entity, "nameKey")),
    ...createGoblinHireCardSkinFormState(skin)
  };
}

function createGoblinHireCardSkinFormState(hireCardSkin: ContentRecord): EntityFormState {
  return Object.fromEntries(
    goblinUiSkinFields.map((item) => [item.field, stringFieldAtPath(hireCardSkin, item.path) || item.defaultAssetId])
  );
}

export function createDefaultGoblinRoles(): ContentRecord[] {
  return goblinRoleOptions.map((role, index) => ({
    ...createGoblinRoleAssetIds(role.value),
    descriptionKey: `goblin.${role.value}.description`,
    hireCost: role.value === "miner" ? [] : [{ amount: role.value === "collector" ? 300 : 900, resourceId: "gold" }],
    id: role.value,
    levels: [
      createGoblinRoleLevel(1, 5, 100 + index * 40),
      createGoblinRoleLevel(2, 12, 500 + index * 120),
      createGoblinRoleLevel(3, 26, 1400 + index * 220)
    ],
    nameKey: `goblin.${role.value}.name`,
    role: role.value,
    sortOrder: (index + 1) * 10,
    statKey: role.statKey,
    statNameKey: `goblin.stat.${role.statKey}`,
    unlockRequirements: role.value === "miner" ? [] : role.value === "collector" ? [{ type: "built_mines_count", value: 1 }] : [{ type: "built_mines_count", value: 2 }]
  }));
}

function createGoblinRoleLevel(level: number, baseStat: number, baseUpgradeCost: number): ContentRecord {
  return {
    level,
    stars: Array.from({ length: 6 }, (_, star) => ({
      modifiers: [],
      stars: star,
      statValue: baseStat + star * Math.max(1, Math.ceil(level / 2)),
      upgradeCost: star === 5 ? [{ amount: Math.round(baseUpgradeCost * level), resourceId: "gold" }] : []
    }))
  };
}

function normalizeGoblinRoles(roles: ContentRecord[]): ContentRecord[] {
  const byRole = new Map(roles.map((role) => [stringField(role, "role"), role]));

  return goblinRoleOptions.map((role, index) => {
    const current = byRole.get(role.value) ?? {};
    const currentLevels = normalizeGoblinRoleLevels(arrayField(current, "levels"));
    const defaultRole = recordAt(createDefaultGoblinRoles(), index);
    const defaultAssetIds = createGoblinRoleAssetIds(role.value);
    const currentAssetId = stringField(current, "assetId");
    const currentHireAssetId = stringField(current, "hireAssetId");
    const currentDetailsAssetId = stringField(current, "detailsAssetId");
    const hasLegacySharedAssetId =
      currentAssetId === currentHireAssetId &&
      currentAssetId === currentDetailsAssetId &&
      isLegacySharedGoblinRoleAssetId(currentAssetId, role.value);

    return {
      ...defaultRole,
      ...current,
      assetId: hasLegacySharedAssetId ? defaultAssetIds.assetId : currentAssetId || stringField(defaultRole, "assetId"),
      hireAssetId: hasLegacySharedAssetId
        ? defaultAssetIds.hireAssetId
        : currentHireAssetId || stringField(defaultRole, "hireAssetId"),
      detailsAssetId: hasLegacySharedAssetId
        ? defaultAssetIds.detailsAssetId
        : currentDetailsAssetId || stringField(defaultRole, "detailsAssetId"),
      id: role.value,
      levels: currentLevels.length > 0 ? currentLevels : arrayField(recordAt(createDefaultGoblinRoles(), index), "levels"),
      role: role.value,
      sortOrder: numberField(current, "sortOrder", (index + 1) * 10),
      statKey: role.statKey,
      statNameKey: stringField(current, "statNameKey") || `goblin.stat.${role.statKey}`
    };
  });
}

function normalizeGoblinRoleLevels(levels: ContentRecord[]): ContentRecord[] {
  return levels
    .map((level, index) => ({
      ...level,
      level: numberField(level, "level", index + 1),
      stars: normalizeGoblinStars(arrayField(level, "stars"))
    }))
    .sort((left, right) => numberField(left, "level", 0) - numberField(right, "level", 0));
}

function normalizeGoblinStars(stars: ContentRecord[]): ContentRecord[] {
  const byRank = new Map(stars.map((star) => [numberField(star, "stars", 0), star]));

  return Array.from({ length: 6 }, (_, rank) => ({
    modifiers: [],
    ...(byRank.get(rank) ?? {}),
    stars: rank,
    statValue: Math.max(1, numberField(byRank.get(rank) ?? {}, "statValue", 5)),
    upgradeCost: rank === 5 ? arrayField(byRank.get(rank) ?? {}, "upgradeCost") : []
  }));
}

function goblinRoleOption(role: string): GoblinRoleOption {
  return goblinRoleOptions.find((option) => option.value === role) ?? goblinRoleOptions[0];
}

function createGoblinRoleAssetIds(role: AdminGoblinRole): Pick<ContentRecord, "assetId" | "detailsAssetId" | "hireAssetId"> {
  return {
    assetId: `goblin_owned_${role}_v1`,
    detailsAssetId: `goblin_details_${role}_v1`,
    hireAssetId: `goblin_hire_${role}_v1`
  };
}

function isLegacySharedGoblinRoleAssetId(assetId: string, role: AdminGoblinRole): boolean {
  return assetId === `goblin_hire_${role}_v1` || (role === "collector" && assetId === "goblin_hire_builder_v1");
}

export function validateGoblinsForm(state: EntityFormState, _content: ContentBundle, errors: string[]) {
  for (const field of goblinUiSkinFields) {
    if ("required" in field && field.required === false) {
      continue;
    }

    if (!formValue(state, field.field).trim()) {
      errors.push(`${field.label}: Asset ID обязателен.`);
    }
  }

  const parsed = parseJsonRecordArray(formValue(state, "rolesJson"));
  if (!parsed.ok) {
    errors.push("Роли гоблинов должны быть валидным JSON-массивом.");
    return;
  }

  const roles = normalizeGoblinRoles(parsed.value);
  const seenRoles = new Set<string>();

  for (const role of roles) {
    const roleId = stringField(role, "role");
    const roleOption = goblinRoleOption(roleId);

    if (seenRoles.has(roleId)) {
      errors.push(`Роль ${roleId}: дубль роли.`);
    }
    seenRoles.add(roleId);

    if (stringField(role, "id") !== roleOption.value) {
      errors.push(`${roleOption.label}: ID должен совпадать с ролью.`);
    }

    if (stringField(role, "statKey") !== roleOption.statKey) {
      errors.push(`${roleOption.label}: основной параметр должен быть ${roleOption.statKey}.`);
    }

    if (!stringField(role, "assetId")) {
      errors.push(`${roleOption.label}: Asset ID маленькой карточки обязателен.`);
    }

    if (!stringField(role, "hireAssetId")) {
      errors.push(`${roleOption.label}: Asset ID картинки найма обязателен.`);
    }

    if (!stringField(role, "detailsAssetId")) {
      errors.push(`${roleOption.label}: Asset ID картинки попапа обязателен.`);
    }

    const visualAssetIds = [stringField(role, "assetId"), stringField(role, "hireAssetId"), stringField(role, "detailsAssetId")].filter(Boolean);
    if (new Set(visualAssetIds).size < visualAssetIds.length) {
      errors.push(`${roleOption.label}: Asset ID маленькой карточки, найма и попапа должны быть разными.`);
    }

    for (const cost of arrayField(role, "hireCost")) {
      if (stringField(cost, "resourceId") !== "gold") {
        errors.push(`${roleOption.label}: найм должен стоить только золото.`);
      }
    }

    validateGoblinRoleLevels(roleOption, arrayField(role, "levels"), errors);
  }
}

function validateGoblinRoleLevels(roleOption: GoblinRoleOption, levels: ContentRecord[], errors: string[]) {
  const seenLevels = new Set<number>();

  for (let levelIndex = 0; levelIndex < levels.length; levelIndex += 1) {
    const level = recordAt(levels, levelIndex);
    const levelNumber = numberField(level, "level", levelIndex + 1);
    const stars = arrayField(level, "stars");

    if (seenLevels.has(levelNumber)) {
      errors.push(`${roleOption.label}: уровень ${levelNumber} повторяется.`);
    }
    seenLevels.add(levelNumber);

    if (stars.length !== 6) {
      errors.push(`${roleOption.label}: уровень ${levelNumber} должен иметь 6 рангов звезд.`);
    }

    const seenStars = new Set<number>();
    for (const star of stars) {
      const rank = numberField(star, "stars", 0);
      seenStars.add(rank);

      if (rank < 0 || rank > 5) {
        errors.push(`${roleOption.label}: уровень ${levelNumber} имеет некорректную звезду ${rank}.`);
      }

      if (numberField(star, "statValue", 0) <= 0) {
        errors.push(`${roleOption.label}: уровень ${levelNumber}, звезда ${rank}: ${roleOption.statLabel} должен быть больше 0.`);
      }

      if (rank < 5 && arrayField(star, "upgradeCost").length > 0) {
        errors.push(`${roleOption.label}: уровень ${levelNumber}, звезда ${rank}: стоимость должна быть пустой, звезды получаются объединением.`);
      }

      for (const cost of arrayField(star, "upgradeCost")) {
        if (stringField(cost, "resourceId") !== "gold") {
          errors.push(`${roleOption.label}: улучшение должно стоить только золото.`);
        }
      }
    }

    for (let rank = 0; rank <= 5; rank += 1) {
      if (!seenStars.has(rank)) {
        errors.push(`${roleOption.label}: уровень ${levelNumber} пропускает звезду ${rank}.`);
      }
    }
  }
}

export function applyGoblinsForm(
  content: ContentBundle,
  selectedId: string,
  state: EntityFormState
): {
  entity: ContentRecord;
  entityId: string;
  entityType: "goblins";
  localization: Record<string, string>;
  message: string;
} {
  const current = content.goblins ?? {};
  const id = formValue(state, "id") || "default";
  const nameKey = stringField(current, "nameKey") || "goblins.name";
  const parsed = parseJsonRecordArray(formValue(state, "rolesJson"));

  if (!parsed.ok) {
    throw new Error("Роли гоблинов должны быть валидным JSON-массивом.");
  }

  return {
    entity: {
      id,
      nameKey,
      roles: normalizeGoblinRoles(parsed.value),
      skin: createGoblinSkinFromForm(state)
    },
    entityId: selectedId,
    entityType: "goblins",
    localization: {
      [nameKey]: formValue(state, "title").trim()
    },
    message: `Гоблины ${id} сохранены как draft.`
  };
}

function createGoblinSkinFromForm(state: EntityFormState): ContentRecord {
  return {
    buttons: {
      disabled: formValue(state, "skinButtonDisabled").trim(),
      hover: formValue(state, "skinButtonHover").trim(),
      normal: formValue(state, "skinButtonNormal").trim(),
      pressed: formValue(state, "skinButtonPressed").trim()
    },
    cardBase: formValue(state, "skinCardBase").trim(),
    detailsModalBackground: "",
    ownedCards: {
      base: formValue(state, "skinOwnedCardBase").trim(),
      starIcon: formValue(state, "skinOwnedStarIcon").trim(),
      upgradeArrow: formValue(state, "skinOwnedUpgradeArrow").trim()
    },
    resourceChipFrame: "ui_resource_chip_frame_v1",
    screenBackground: "ui_goblin_screen_pattern_v1",
    titlePlate: formValue(state, "skinTitlePlate").trim()
  };
}
