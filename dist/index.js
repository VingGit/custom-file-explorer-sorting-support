import { createRequire } from 'module';
import fs from 'fs/promises';
import path from 'path';

createRequire(import.meta.url);

// node_modules/obsidian-custom-sort/src/utils/week-of-year.ts
var DAY_OF_MILIS = 60 * 60 * 24 * 1e3;
var DAYS_IN_WEEK = 7;
var MondaysCache = {};
var calculateMondayDateIn1stWeekOfYear = (year) => {
  const firstSecondOfYear = /* @__PURE__ */ new Date(`${year}-01-01T00:00:00.000Z`);
  const SUNDAY = 0;
  const MONDAY = 1;
  const FRIDAY = 5;
  const SATURDAY = 6;
  const dayOfWeek = firstSecondOfYear.getDay();
  let daysToPrevMonday = 0;
  if (dayOfWeek === SUNDAY) {
    daysToPrevMonday = DAYS_IN_WEEK - 1;
  } else if (dayOfWeek > MONDAY) {
    daysToPrevMonday = dayOfWeek - MONDAY;
  }
  const useISOoffset = [FRIDAY, SATURDAY, SUNDAY].includes(dayOfWeek) ? DAYS_IN_WEEK : 0;
  return {
    year,
    mondayDateOf1stWeekUS: new Date(firstSecondOfYear).setDate(firstSecondOfYear.getDate() - daysToPrevMonday),
    sundayDateOf1stWeekUS: new Date(firstSecondOfYear).setDate(firstSecondOfYear.getDate() - daysToPrevMonday + DAYS_IN_WEEK - 1),
    mondayDateOf1stWeekISO: new Date(firstSecondOfYear).setDate(firstSecondOfYear.getDate() - daysToPrevMonday + useISOoffset),
    sundayDateOf1stWeekISO: new Date(firstSecondOfYear).setDate(firstSecondOfYear.getDate() - daysToPrevMonday + useISOoffset + DAYS_IN_WEEK - 1)
  };
};
var getDateForWeekOfYear = (year, weekNumber, useISO, sunday) => {
  const WEEK_OF_MILIS = DAYS_IN_WEEK * DAY_OF_MILIS;
  const dataOfMondayIn1stWeekOfYear = MondaysCache[year] ??= calculateMondayDateIn1stWeekOfYear(year);
  const mondayOfTheRequestedWeek = (useISO ? dataOfMondayIn1stWeekOfYear.mondayDateOf1stWeekISO : dataOfMondayIn1stWeekOfYear.mondayDateOf1stWeekUS) + (weekNumber - 1) * WEEK_OF_MILIS;
  const sundayOfTheRequestedWeek = (useISO ? dataOfMondayIn1stWeekOfYear.sundayDateOf1stWeekISO : dataOfMondayIn1stWeekOfYear.sundayDateOf1stWeekUS) + (weekNumber - 1) * WEEK_OF_MILIS;
  return new Date(sunday ? sundayOfTheRequestedWeek : mondayOfTheRequestedWeek);
};

// node_modules/obsidian-custom-sort/src/custom-sort/matchers.ts
var RomanNumberRegexStr = " *([MDCLXVI]+)";
var CompoundRomanNumberDotRegexStr = " *([MDCLXVI]+(?:\\.[MDCLXVI]+)*)";
var CompoundRomanNumberDashRegexStr = " *([MDCLXVI]+(?:-[MDCLXVI]+)*)";
var NumberRegexStr = " *(\\d+)";
var CompoundNumberDotRegexStr = " *(\\d+(?:\\.\\d+)*)";
var CompoundNumberDashRegexStr = " *(\\d+(?:-\\d+)*)";
var Date_yyyy_mm_dd_RegexStr = " *(\\d{4}-[0-3]*[0-9]-[0-3]*[0-9])";
var Date_yyyy_dd_mm_RegexStr = Date_yyyy_mm_dd_RegexStr;
var Date_mm_dd_yyyy_RegexStr = " *([0-3]*[0-9]-[0-3]*[0-9]-\\d{4})";
var Date_dd_mm_yyyy_RegexStr = Date_mm_dd_yyyy_RegexStr;
var Date_dd_Mmm_yyyy_RegexStr = " *([0-3]*[0-9]-(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-\\d{4})";
var Date_Mmm_dd_yyyy_RegexStr = " *((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-[0-3]*[0-9]-\\d{4})";
var Date_yyyy_Www_mm_dd_RegexStr = " *(\\d{4}-W[0-5]*[0-9] \\([0-3]*[0-9]-[0-3]*[0-9]\\))";
var Date_yyyy_WwwISO_RegexStr = " *(\\d{4}-W[0-5]*[0-9][-+]?)";
var Date_yyyy_Www_RegexStr = Date_yyyy_WwwISO_RegexStr;
var DOT_SEPARATOR = ".";
var DASH_SEPARATOR = "-";
var SLASH_SEPARATOR = "/";
var GT_SEPARATOR = ">";
var PIPE_SEPARATOR = "|";
var EARLIER_THAN_SLASH_SEPARATOR = DOT_SEPARATOR;
var LATER_THAN_SLASH_SEPARATOR = GT_SEPARATOR;
var DEFAULT_NORMALIZATION_PLACES = 8;
var WordInAnyLanguageRegexStr = "(\\p{Letter}+)";
var WordInASCIIRegexStr = "([a-zA-Z]+)";
function prependWithZeros(s, minLength) {
  if ("string" === typeof s) {
    if (s.length < minLength) {
      const delta = minLength - s.length;
      return "000000000000000000000000000".substring(0, delta) + s;
    } else {
      return s;
    }
  } else {
    return prependWithZeros((s ?? "").toString(), minLength);
  }
}
function getNormalizedNumber(s = "", separator, places) {
  if (separator) {
    const components = s.split(separator).filter((s2) => s2);
    return `${components.map((c) => prependWithZeros(c, DEFAULT_NORMALIZATION_PLACES)).join(PIPE_SEPARATOR)}${SLASH_SEPARATOR}${SLASH_SEPARATOR}`;
  } else {
    return `${prependWithZeros(s, DEFAULT_NORMALIZATION_PLACES)}${SLASH_SEPARATOR}${SLASH_SEPARATOR}`;
  }
}
function RomanCharToInt(c) {
  const Roman = "0iIvVxXlLcCdDmM";
  const RomanValues = [0, 1, 1, 5, 5, 10, 10, 50, 50, 100, 100, 500, 500, 1e3, 1e3];
  if (c) {
    const idx = Roman.indexOf(c[0]);
    return idx > 0 ? RomanValues[idx] : 0;
  } else {
    return 0;
  }
}
function romanToIntStr(rs) {
  if (rs == null) return "0";
  let num = RomanCharToInt(rs.charAt(0));
  let prev, curr;
  for (let i = 1; i < rs.length; i++) {
    curr = RomanCharToInt(rs.charAt(i));
    prev = RomanCharToInt(rs.charAt(i - 1));
    if (curr <= prev) {
      num += curr;
    } else {
      num = num - prev * 2 + curr;
    }
  }
  return `${num}`;
}
function getNormalizedRomanNumber(s, separator, places) {
  if (separator) {
    const components = s.split(separator).filter((s2) => s2);
    return `${components.map((c) => prependWithZeros(romanToIntStr(c), DEFAULT_NORMALIZATION_PLACES)).join(PIPE_SEPARATOR)}${SLASH_SEPARATOR}${SLASH_SEPARATOR}`;
  } else {
    return `${prependWithZeros(romanToIntStr(s), DEFAULT_NORMALIZATION_PLACES)}${SLASH_SEPARATOR}${SLASH_SEPARATOR}`;
  }
}
var DAY_POSITIONS = "00".length;
var MONTH_POSITIONS = "00".length;
var YEAR_POSITIONS = "0000".length;
var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function getNormalizedDate_NormalizerFn_for(separator, dayIdx, monthIdx, yearIdx, months) {
  return (s) => {
    const components = s.split(separator);
    const day = prependWithZeros(components[dayIdx], DAY_POSITIONS);
    const monthValue = months ? `${1 + MONTHS.indexOf(components[monthIdx])}` : components[monthIdx];
    const month = prependWithZeros(monthValue, MONTH_POSITIONS);
    const year = prependWithZeros(components[yearIdx], YEAR_POSITIONS);
    return `${year}-${month}-${day}${SLASH_SEPARATOR}${SLASH_SEPARATOR}`;
  };
}
var getNormalizedDate_yyyy_mm_dd_NormalizerFn = getNormalizedDate_NormalizerFn_for("-", 2, 1, 0);
var getNormalizedDate_yyyy_dd_mm_NormalizerFn = getNormalizedDate_NormalizerFn_for("-", 1, 2, 0);
var getNormalizedDate_mm_dd_yyyy_NormalizerFn = getNormalizedDate_NormalizerFn_for("-", 1, 0, 2);
var getNormalizedDate_dd_mm_yyyy_NormalizerFn = getNormalizedDate_NormalizerFn_for("-", 0, 1, 2);
var getNormalizedDate_dd_Mmm_yyyy_NormalizerFn = getNormalizedDate_NormalizerFn_for("-", 0, 1, 2, MONTHS);
var getNormalizedDate_Mmm_dd_yyyy_NormalizerFn = getNormalizedDate_NormalizerFn_for("-", 1, 0, 2, MONTHS);
var DateExtractor_orderModifier_earlier_than = "-";
var DateExtractor_orderModifier_later_than = "+";
var DateExtractor_yyyy_Www_mm_dd_Regex = /(\d{4})-W(\d{1,2}) \((\d{2})-(\d{2})\)/;
var DateExtractor_yyyy_Www_Regex = /(\d{4})-W(\d{1,2})([-+]?)/;
var YEAR_IDX = 1;
var WEEK_IDX = 2;
var MONTH_IDX = 3;
var DAY_IDX = 4;
var RELATIVE_ORDER_IDX = 3;
var DECEMBER = 12;
var JANUARY = 1;
function getNormalizedDate_NormalizerFn_yyyy_Www_mm_dd(consumeWeek, weeksISO) {
  return (s) => {
    const matches = consumeWeek ? DateExtractor_yyyy_Www_Regex.exec(s) : DateExtractor_yyyy_Www_mm_dd_Regex.exec(s);
    const yearStr = matches[YEAR_IDX];
    let yearNumber = Number.parseInt(yearStr, 10);
    let monthNumber;
    let dayNumber;
    let separator = SLASH_SEPARATOR;
    let useLastDayOfWeek = false;
    if (consumeWeek) {
      const weekNumberStr = matches[WEEK_IDX];
      const weekNumber = Number.parseInt(weekNumberStr, 10);
      const orderModifier = matches[RELATIVE_ORDER_IDX];
      if (orderModifier === DateExtractor_orderModifier_earlier_than) {
        separator = EARLIER_THAN_SLASH_SEPARATOR;
      } else if (orderModifier === DateExtractor_orderModifier_later_than) {
        separator = LATER_THAN_SLASH_SEPARATOR;
        useLastDayOfWeek = true;
      }
      const dateForWeek = getDateForWeekOfYear(yearNumber, weekNumber, weeksISO, useLastDayOfWeek);
      monthNumber = dateForWeek.getMonth() + 1;
      dayNumber = dateForWeek.getDate();
      if (weekNumber === 1) {
        if (monthNumber === DECEMBER) {
          yearNumber--;
        }
      }
      if (weekNumber >= 50) {
        if (monthNumber === JANUARY) {
          yearNumber++;
        }
      }
    } else {
      monthNumber = Number.parseInt(matches[MONTH_IDX], 10);
      dayNumber = Number.parseInt(matches[DAY_IDX], 10);
    }
    return `${prependWithZeros(`${yearNumber}`, YEAR_POSITIONS)}-${prependWithZeros(`${monthNumber}`, MONTH_POSITIONS)}-${prependWithZeros(`${dayNumber}`, DAY_POSITIONS)}${separator}${SLASH_SEPARATOR}`;
  };
}
var getNormalizedDate_yyyy_Www_mm_dd_NormalizerFn = getNormalizedDate_NormalizerFn_yyyy_Www_mm_dd(false);
var getNormalizedDate_yyyy_WwwISO_NormalizerFn = getNormalizedDate_NormalizerFn_yyyy_Www_mm_dd(true, true);
var getNormalizedDate_yyyy_Www_NormalizerFn = getNormalizedDate_NormalizerFn_yyyy_Www_mm_dd(true, false);

// node_modules/obsidian-custom-sort/src/custom-sort/mdata-extractors.ts
function getGenericPlainRegexpExtractorFn(extractorRegexp, extractedValueNormalizer) {
  return (mdataValue) => {
    const hasMatch = mdataValue?.match(extractorRegexp);
    if (hasMatch && hasMatch[0]) {
      return extractedValueNormalizer(hasMatch[0]) ?? void 0;
    } else {
      return void 0;
    }
  };
}
var Extractors = [
  {
    specPattern: "date(dd/mm/yyyy)",
    extractorFn: getGenericPlainRegexpExtractorFn(
      new RegExp("\\d{2}/\\d{2}/\\d{4}"),
      getNormalizedDate_NormalizerFn_for("/", 0, 1, 2)
    )
  },
  {
    specPattern: "date(mm/dd/yyyy)",
    extractorFn: getGenericPlainRegexpExtractorFn(
      new RegExp("\\d{2}/\\d{2}/\\d{4}"),
      getNormalizedDate_NormalizerFn_for("/", 1, 0, 2)
    )
  }
];
var tryParseAsMDataExtractorSpec = (s) => {
  for (const extrSpec of Extractors) {
    if ("string" === typeof extrSpec.specPattern && s.trim().startsWith(extrSpec.specPattern)) {
      return {
        m: extrSpec.extractorFn,
        remainder: s.substring(extrSpec.specPattern.length).trim()
      };
    }
  }
  return void 0;
};
({
  extractorFnForDate_ddmmyyyy: Extractors.find((it) => it.specPattern === "date(dd/mm/yyyy)")?.extractorFn,
  extractorFnForDate_mmddyyyy: Extractors.find((it) => it.specPattern === "date(mm/dd/yyyy)")?.extractorFn
});

// node_modules/obsidian-custom-sort/src/custom-sort/custom-sort-types.ts
var IdentityNormalizerFn = (s) => s;
var DEFAULT_METADATA_FIELD_FOR_SORTING = "sort-index-value";

// node_modules/obsidian-custom-sort/src/utils/utils.ts
function isDefined(o) {
  return o !== void 0 && o !== null;
}
function last(o) {
  return o?.length > 0 ? o[o.length - 1] : void 0;
}

// node_modules/obsidian-custom-sort/src/custom-sort/folder-matching-rules.ts
var SLASH = "/";
var MATCH_CHILDREN_PATH_TOKEN = "...";
var MATCH_ALL_PATH_TOKEN = "*";
var MATCH_CHILDREN_1_SUFFIX = `/${MATCH_CHILDREN_PATH_TOKEN}`;
var MATCH_CHILDREN_2_SUFFIX = `/${MATCH_CHILDREN_PATH_TOKEN}/`;
var MATCH_ALL_SUFFIX = `/${MATCH_ALL_PATH_TOKEN}`;
var NO_PRIORITY = 0;
var splitPath = (path2) => {
  return path2.split(SLASH).filter((name) => !!name);
};
var FolderWildcardMatching = class {
  constructor(checkIfImplicitSpec) {
    this.checkIfImplicitSpec = checkIfImplicitSpec;
  }
  checkIfImplicitSpec;
  // mimics the structure of folders, so for example tree.matchAll contains the matchAll flag for the root '/'
  tree = {
    subtree: {}
  };
  regexps;
  // cache
  determinedWildcardRules = {};
  addWildcardDefinition = (wilcardDefinition, rule) => {
    const pathComponents = splitPath(wilcardDefinition);
    const lastComponent = pathComponents.pop();
    if (lastComponent !== MATCH_ALL_PATH_TOKEN && lastComponent !== MATCH_CHILDREN_PATH_TOKEN) {
      return null;
    }
    let leafNode = this.tree;
    pathComponents.forEach((pathComponent) => {
      let subtree = leafNode.subtree[pathComponent];
      if (subtree) {
        leafNode = subtree;
      } else {
        const newSubtree = {
          name: pathComponent,
          subtree: {}
        };
        leafNode.subtree[pathComponent] = newSubtree;
        leafNode = newSubtree;
      }
    });
    if (lastComponent === MATCH_CHILDREN_PATH_TOKEN) {
      if (leafNode.matchChildren && !this.checkIfImplicitSpec(leafNode.matchChildren)) {
        return { errorMsg: `Duplicate wildcard '${lastComponent}' specification for ${wilcardDefinition}` };
      } else {
        leafNode.matchChildren = rule;
      }
    } else {
      if (leafNode.matchAll && !this.checkIfImplicitSpec(leafNode.matchAll)) {
        return { errorMsg: `Duplicate wildcard '${lastComponent}' specification for ${wilcardDefinition}` };
      } else {
        leafNode.matchAll = rule;
      }
    }
  };
  addRegexpDefinition = (regexp, againstName, priority, log, rule) => {
    const newItem = {
      regexp,
      againstName,
      priority: priority || NO_PRIORITY,
      sortingSpec: rule,
      logMatches: !!log
    };
    if (this.regexps === void 0 || this.regexps.length === 0) {
      this.regexps = [newItem];
    } else {
      let idx = 0;
      while (idx < this.regexps.length && this.regexps[idx].priority > newItem.priority) {
        idx++;
      }
      this.regexps.splice(idx, 0, newItem);
    }
  };
  folderMatch = (folderPath, folderName) => {
    const spec = this.determinedWildcardRules[folderPath];
    if (spec) {
      return spec.spec ?? null;
    } else {
      let rule;
      if (this.regexps) {
        for (let r of this.regexps) {
          if (r.againstName && !folderName) {
            continue;
          }
          if (r.regexp.test(r.againstName ? folderName || "" : folderPath)) {
            rule = r.sortingSpec;
            if (r.logMatches) {
              const msgDetails = r.againstName ? `name: ${folderName}` : `path: ${folderPath}`;
              console.log(`custom-sort plugin - regexp <${r.regexp.source}> matched folder ${msgDetails}`);
            }
            break;
          }
        }
      }
      if (!rule) {
        rule = this.tree.matchChildren;
        let inheritedRule = this.tree.matchAll;
        const pathComponents = splitPath(folderPath);
        let parentNode = this.tree;
        let lastIdx = pathComponents.length - 1;
        for (let i = 0; i <= lastIdx; i++) {
          const name = pathComponents[i];
          let matchedPath = parentNode.subtree[name];
          if (matchedPath) {
            parentNode = matchedPath;
            rule = matchedPath?.matchChildren ?? null;
            inheritedRule = matchedPath.matchAll ?? inheritedRule;
          } else {
            if (i < lastIdx) {
              rule = inheritedRule;
            }
            break;
          }
        }
        rule ??= inheritedRule;
      }
      if (rule) {
        this.determinedWildcardRules[folderPath] = { spec: rule };
        return rule;
      } else {
        this.determinedWildcardRules[folderPath] = {};
        return null;
      }
    }
  };
};

// node_modules/obsidian-custom-sort/src/custom-sort/sorting-spec-processor.ts
var ProblemCode = /* @__PURE__ */ ((ProblemCode2) => {
  ProblemCode2[ProblemCode2["SyntaxError"] = 0] = "SyntaxError";
  ProblemCode2[ProblemCode2["SyntaxErrorInGroupSpec"] = 1] = "SyntaxErrorInGroupSpec";
  ProblemCode2[ProblemCode2["DuplicateSortSpecForSameFolder"] = 2] = "DuplicateSortSpecForSameFolder";
  ProblemCode2[ProblemCode2["DuplicateOrderAttr"] = 3] = "DuplicateOrderAttr";
  ProblemCode2[ProblemCode2["DanglingOrderAttr"] = 4] = "DanglingOrderAttr";
  ProblemCode2[ProblemCode2["MissingAttributeValue"] = 5] = "MissingAttributeValue";
  ProblemCode2[ProblemCode2["NoSpaceBetweenAttributeAndValue"] = 6] = "NoSpaceBetweenAttributeAndValue";
  ProblemCode2[ProblemCode2["InvalidAttributeValue"] = 7] = "InvalidAttributeValue";
  ProblemCode2[ProblemCode2["TargetFolderNestedSpec"] = 8] = "TargetFolderNestedSpec";
  ProblemCode2[ProblemCode2["TooManySortingSymbols"] = 9] = "TooManySortingSymbols";
  ProblemCode2[ProblemCode2["SortingSymbolAdjacentToWildcard"] = 10] = "SortingSymbolAdjacentToWildcard";
  ProblemCode2[ProblemCode2["ItemToHideExactNameWithExtRequired"] = 11] = "ItemToHideExactNameWithExtRequired";
  ProblemCode2[ProblemCode2["ItemToHideNoSupportForThreeDots"] = 12] = "ItemToHideNoSupportForThreeDots";
  ProblemCode2[ProblemCode2["DuplicateWildcardSortSpecForSameFolder"] = 13] = "DuplicateWildcardSortSpecForSameFolder";
  ProblemCode2[ProblemCode2["ProblemNoLongerApplicable_StandardObsidianSortAllowedOnlyAtFolderLevel"] = 14] = "ProblemNoLongerApplicable_StandardObsidianSortAllowedOnlyAtFolderLevel";
  ProblemCode2[ProblemCode2["PriorityNotAllowedOnOutsidersGroup"] = 15] = "PriorityNotAllowedOnOutsidersGroup";
  ProblemCode2[ProblemCode2["TooManyPriorityPrefixes"] = 16] = "TooManyPriorityPrefixes";
  ProblemCode2[ProblemCode2["CombiningNotAllowedOnOutsidersGroup"] = 17] = "CombiningNotAllowedOnOutsidersGroup";
  ProblemCode2[ProblemCode2["TooManyCombinePrefixes"] = 18] = "TooManyCombinePrefixes";
  ProblemCode2[ProblemCode2["ModifierPrefixesOnlyOnOutsidersGroup"] = 19] = "ModifierPrefixesOnlyOnOutsidersGroup";
  ProblemCode2[ProblemCode2["OnlyLastCombinedGroupCanSpecifyOrder"] = 20] = "OnlyLastCombinedGroupCanSpecifyOrder";
  ProblemCode2[ProblemCode2["TooManyGroupTypePrefixes"] = 21] = "TooManyGroupTypePrefixes";
  ProblemCode2[ProblemCode2["PriorityPrefixAfterGroupTypePrefix"] = 22] = "PriorityPrefixAfterGroupTypePrefix";
  ProblemCode2[ProblemCode2["CombinePrefixAfterGroupTypePrefix"] = 23] = "CombinePrefixAfterGroupTypePrefix";
  ProblemCode2[ProblemCode2["InlineRegexInPrefixAndSuffix"] = 24] = "InlineRegexInPrefixAndSuffix";
  ProblemCode2[ProblemCode2["DuplicateByNameSortSpecForFolder"] = 25] = "DuplicateByNameSortSpecForFolder";
  ProblemCode2[ProblemCode2["EmptyFolderNameToMatch"] = 26] = "EmptyFolderNameToMatch";
  ProblemCode2[ProblemCode2["InvalidOrEmptyFolderMatchingRegexp"] = 27] = "InvalidOrEmptyFolderMatchingRegexp";
  return ProblemCode2;
})(ProblemCode || {});
var ContextFreeProblems = /* @__PURE__ */ new Set([
  2 /* DuplicateSortSpecForSameFolder */,
  13 /* DuplicateWildcardSortSpecForSameFolder */,
  20 /* OnlyLastCombinedGroupCanSpecifyOrder */,
  25 /* DuplicateByNameSortSpecForFolder */,
  26 /* EmptyFolderNameToMatch */,
  27 /* InvalidOrEmptyFolderMatchingRegexp */
]);
var ThreeDots = "...";
var ThreeDotsLength = ThreeDots.length;
var AmbigueFourDotsEscaper = "./...";
var AmbigueFourDotsEscaperLength = AmbigueFourDotsEscaper.length;
var AmbigueFourDotsEscaperOverlap = 1;
var MAX_SORT_LEVEL = 1;
var OrderLiterals = {
  "a-z.": { asc: 2 /* alphabeticalWithFileExt */, desc: 6 /* alphabeticalReverseWithFileExt */ },
  "a-z": { asc: 1 /* alphabetical */, desc: 5 /* alphabeticalReverse */ },
  "true a-z.": { asc: 4 /* trueAlphabeticalWithFileExt */, desc: 8 /* trueAlphabeticalReverseWithFileExt */ },
  "true a-z": { asc: 3 /* trueAlphabetical */, desc: 7 /* trueAlphabeticalReverse */ },
  "created": { asc: 15 /* byCreatedTime */, desc: 18 /* byCreatedTimeReverse */ },
  "modified": { asc: 9 /* byModifiedTime */, desc: 12 /* byModifiedTimeReverse */ },
  "advanced modified": { asc: 10 /* byModifiedTimeAdvanced */, desc: 13 /* byModifiedTimeReverseAdvanced */ },
  "advanced created": { asc: 16 /* byCreatedTimeAdvanced */, desc: 19 /* byCreatedTimeReverseAdvanced */ },
  "advanced recursive modified": { asc: 11 /* byModifiedTimeAdvancedRecursive */, desc: 14 /* byModifiedTimeReverseAdvancedRecursive */ },
  "advanced recursive created": { asc: 17 /* byCreatedTimeAdvancedRecursive */, desc: 20 /* byCreatedTimeReverseAdvancedRecursive */ },
  "standard": { asc: 25 /* standardObsidian */, desc: 25 /* standardObsidian */ },
  "ui selected": { asc: 25 /* standardObsidian */, desc: 25 /* standardObsidian */ },
  "by-bookmarks-order": { asc: 26 /* byBookmarkOrder */, desc: 27 /* byBookmarkOrderReverse */ },
  "files-first": { asc: 28 /* fileFirst */, desc: 28 /* fileFirst */ },
  "folders-first": { asc: 29 /* folderFirst */, desc: 29 /* folderFirst */ },
  "vsc-unicode-natural": { asc: 34 /* vscUnicodeNatural */, desc: 35 /* vscUnicodeNaturalReverse */ },
  "unicode-charcode-natural": { asc: 34 /* vscUnicodeNatural */, desc: 35 /* vscUnicodeNaturalReverse */ },
  "vsc-unicode": { asc: 32 /* vscUnicode */, desc: 33 /* vscUnicodeReverse */ },
  "unicode-charcode": { asc: 32 /* vscUnicode */, desc: 33 /* vscUnicodeReverse */ }
};
var OrderByMetadataLexeme = "by-metadata:";
var ValueExtractorLexeme = "using-extractor:";
var OrderLevelsSeparator = ",";
var SortingOrderSpecInvalid = "Invalid sorting order";
var ErrorMsgForAttribute = {
  [1 /* TargetFolder */]: "Invalid target folder specification",
  [2 /* OrderAsc */]: SortingOrderSpecInvalid,
  [3 /* OrderDesc */]: SortingOrderSpecInvalid,
  [4 /* OrderUnspecified */]: SortingOrderSpecInvalid
};
var TargetFolderLexeme = "target-folder:";
var OrderDirectionAttrLexemes = {
  "<": 2 /* OrderAsc */,
  "\\<": 2 /* OrderAsc */,
  // to allow single-liners in YAML
  ">": 3 /* OrderDesc */,
  "\\>": 3 /* OrderDesc */
  // to allow single-liners in YAML
};
var OrderDirectionPrefixAttrLexemes = {
  ...OrderDirectionAttrLexemes,
  "order-asc:": 2 /* OrderAsc */,
  "order-desc:": 3 /* OrderDesc */,
  "sorting:": 4 /* OrderUnspecified */
};
var OrderDirectionPostfixAttrLexemes = {
  ...OrderDirectionAttrLexemes,
  "order-asc": 2 /* OrderAsc */,
  "order-desc": 3 /* OrderDesc */,
  "asc": 2 /* OrderAsc */,
  "desc": 3 /* OrderDesc */
};
var TargetFolderLexemes = {
  [TargetFolderLexeme]: 1 /* TargetFolder */,
  "::::": 1 /* TargetFolder */
};
var AttrLexemes = {
  ...OrderDirectionPrefixAttrLexemes,
  ...OrderDirectionPostfixAttrLexemes,
  ...TargetFolderLexemes
};
var startsWithOrderAttrLexeme = (s, postfixLexemes) => {
  const hasLexeme = Object.keys(postfixLexemes ? OrderDirectionPostfixAttrLexemes : OrderDirectionPrefixAttrLexemes).find((lexeme) => {
    return s?.toLowerCase().startsWith(lexeme);
  });
  return hasLexeme ? { lexeme: hasLexeme, attr: postfixLexemes ? OrderDirectionPostfixAttrLexemes[hasLexeme] : OrderDirectionPrefixAttrLexemes[hasLexeme] } : void 0;
};
var startsWithOrderNameLiteral = (s) => {
  const hasLiteral = Object.keys(OrderLiterals).find((literal) => {
    return s?.toLowerCase().startsWith(literal);
  });
  return hasLiteral ? { literal: hasLiteral, order: OrderLiterals[hasLiteral] } : void 0;
};
var OrdersSupportedByMetadata = {
  [1 /* alphabetical */]: 21 /* byMetadataFieldAlphabetical */,
  [5 /* alphabeticalReverse */]: 23 /* byMetadataFieldAlphabeticalReverse */,
  [3 /* trueAlphabetical */]: 22 /* byMetadataFieldTrueAlphabetical */,
  [7 /* trueAlphabeticalReverse */]: 24 /* byMetadataFieldTrueAlphabeticalReverse */,
  [2 /* alphabeticalWithFileExt */]: 21 /* byMetadataFieldAlphabetical */,
  [6 /* alphabeticalReverseWithFileExt */]: 23 /* byMetadataFieldAlphabeticalReverse */,
  [4 /* trueAlphabeticalWithFileExt */]: 22 /* byMetadataFieldTrueAlphabetical */,
  [8 /* trueAlphabeticalReverseWithFileExt */]: 24 /* byMetadataFieldTrueAlphabeticalReverse */
};
var CURRENT_FOLDER_SYMBOL = ".";
var FilesGroupVerboseLexeme = "/:files";
var FilesGroupShortLexeme = "/:";
var _1_FilesWithExtGroupVerboseLexeme = "/:files.";
var _1_FilesWithExtGroupShortLexeme = "/:.";
var FoldersGroupVerboseLexeme = "/folders";
var FoldersGroupShortLexeme = "/";
var AnyTypeGroupLexemeShort = "%";
var AnyTypeGroupLexeme1 = "/folders:files";
var _1_AnyTypeWithExtGroupLexeme1 = "/folders:files.";
var AnyTypeGroupLexeme2 = "/%";
var _1_AnyTypeWithExtGroupLexeme2 = "/%.";
var HideItemShortLexeme = "--%";
var HideItemVerboseLexeme = "/--hide:";
var MetadataFieldIndicatorLexeme = "with-metadata:";
var BookmarkedItemIndicatorLexeme = "bookmarked:";
var IconIndicatorLexeme = "with-icon:";
var CommentPrefix = "//";
var PriorityModifierPrio1Lexeme = "/!";
var PriorityModifierPrio2Lexeme = "/!!";
var PriorityModifierPrio3Lexeme = "/!!!";
var PriorityModifierPrio1TargetFolderLexeme = "/!:";
var PriorityModifierPrio2TargetFolderLexeme = "/!!:";
var PriorityModifierPrio3TargetFolderLexeme = "/!!!:";
var PRIO_1 = 1;
var PRIO_2 = 2;
var PRIO_3 = 3;
var SortingGroupPriorityPrefixes = {
  [PriorityModifierPrio1Lexeme]: PRIO_1,
  [PriorityModifierPrio2Lexeme]: PRIO_2,
  [PriorityModifierPrio3Lexeme]: PRIO_3
};
var TargetFolderRegexpPriorityPrefixes = {
  [PriorityModifierPrio1TargetFolderLexeme]: PRIO_1,
  [PriorityModifierPrio2TargetFolderLexeme]: PRIO_2,
  [PriorityModifierPrio3TargetFolderLexeme]: PRIO_3
};
var CombineGroupLexeme = "/+";
var CombiningGroupPrefixes = [
  CombineGroupLexeme
];
var SortingGroupPrefixes = {
  [_1_AnyTypeWithExtGroupLexeme1]: { filenameWithExt: true },
  [_1_AnyTypeWithExtGroupLexeme2]: { filenameWithExt: true },
  [_1_FilesWithExtGroupShortLexeme]: { filesOnly: true, filenameWithExt: true },
  [_1_FilesWithExtGroupVerboseLexeme]: { filesOnly: true, filenameWithExt: true },
  [FilesGroupShortLexeme]: { filesOnly: true },
  [FilesGroupVerboseLexeme]: { filesOnly: true },
  [FoldersGroupShortLexeme]: { foldersOnly: true },
  [FoldersGroupVerboseLexeme]: { foldersOnly: true },
  [AnyTypeGroupLexemeShort]: {},
  [AnyTypeGroupLexeme1]: {},
  [AnyTypeGroupLexeme2]: {},
  [HideItemShortLexeme]: { itemToHide: true },
  [HideItemVerboseLexeme]: { itemToHide: true }
};
var isThreeDots = (s) => {
  return s === ThreeDots;
};
var containsThreeDots = (s) => {
  return s.indexOf(ThreeDots) !== -1;
};
var RomanNumberRegexSymbol = "\\R+";
var CompoundRomanNumberDotRegexSymbol = "\\.R+";
var CompoundRomanNumberDashRegexSymbol = "\\-R+";
var NumberRegexSymbol = "\\d+";
var CompoundNumberDotRegexSymbol = "\\.d+";
var CompoundNumberDashRegexSymbol = "\\-d+";
var WordInASCIIRegexSymbol = "\\a+";
var WordInAnyLanguageRegexSymbol = "\\A+";
var InlineRegexSymbol_Digit1 = "\\d";
var InlineRegexSymbol_Digit2 = "\\[0-9]";
var InlineRegexSymbol_0_to_3 = "\\[0-3]";
var Date_yyyy_mm_dd_RegexSymbol = "\\[yyyy-mm-dd]";
var Date_yyyy_dd_mm_RegexSymbol = "\\[yyyy-dd-mm]";
var Date_dd_Mmm_yyyy_RegexSymbol = "\\[dd-Mmm-yyyy]";
var Date_Mmm_dd_yyyy_RegexSymbol = "\\[Mmm-dd-yyyy]";
var Date_dd_mm_yyyy_RegexSymbol = "\\[dd-mm-yyyy]";
var Date_mm_dd_yyyy_RegexSymbol = "\\[mm-dd-yyyy]";
var Date_yyyy_Www_mm_dd_RegexSymbol = "\\[yyyy-Www (mm-dd)]";
var Date_yyyy_Www_RegexSymbol = "\\[yyyy-Www]";
var Date_yyyy_WwwISO_RegexSymbol = "\\[yyyy-WwwISO]";
var InlineRegexSymbol_CapitalLetter = "\\C";
var InlineRegexSymbol_LowercaseLetter = "\\l";
var UnsafeRegexCharsRegex = /[\^$.\-+\[\]{}()|*?=!\\]/g;
var escapeRegexUnsafeCharacters = (s) => {
  return s.replace(UnsafeRegexCharsRegex, "\\$&");
};
var sortingSymbolsArr = [
  escapeRegexUnsafeCharacters(NumberRegexSymbol),
  escapeRegexUnsafeCharacters(RomanNumberRegexSymbol),
  escapeRegexUnsafeCharacters(CompoundNumberDotRegexSymbol),
  escapeRegexUnsafeCharacters(CompoundNumberDashRegexSymbol),
  escapeRegexUnsafeCharacters(CompoundRomanNumberDotRegexSymbol),
  escapeRegexUnsafeCharacters(CompoundRomanNumberDashRegexSymbol),
  escapeRegexUnsafeCharacters(WordInASCIIRegexSymbol),
  escapeRegexUnsafeCharacters(WordInAnyLanguageRegexSymbol),
  escapeRegexUnsafeCharacters(Date_yyyy_mm_dd_RegexSymbol),
  escapeRegexUnsafeCharacters(Date_yyyy_dd_mm_RegexSymbol),
  escapeRegexUnsafeCharacters(Date_dd_Mmm_yyyy_RegexSymbol),
  escapeRegexUnsafeCharacters(Date_Mmm_dd_yyyy_RegexSymbol),
  escapeRegexUnsafeCharacters(Date_dd_mm_yyyy_RegexSymbol),
  escapeRegexUnsafeCharacters(Date_mm_dd_yyyy_RegexSymbol),
  escapeRegexUnsafeCharacters(Date_yyyy_Www_mm_dd_RegexSymbol),
  escapeRegexUnsafeCharacters(Date_yyyy_WwwISO_RegexSymbol),
  escapeRegexUnsafeCharacters(Date_yyyy_Www_RegexSymbol)
];
var sortingSymbolsRegex = new RegExp(sortingSymbolsArr.join("|"), "gi");
var inlineRegexSymbolsArrEscapedForRegex = [
  escapeRegexUnsafeCharacters(InlineRegexSymbol_Digit1),
  escapeRegexUnsafeCharacters(InlineRegexSymbol_Digit2),
  escapeRegexUnsafeCharacters(InlineRegexSymbol_0_to_3),
  escapeRegexUnsafeCharacters(InlineRegexSymbol_CapitalLetter),
  escapeRegexUnsafeCharacters(InlineRegexSymbol_LowercaseLetter)
];
var inlineRegexSymbolsToRegexExpressionsArr = {
  [InlineRegexSymbol_Digit1]: { regexExpr: "\\d" },
  [InlineRegexSymbol_Digit2]: { regexExpr: "[0-9]" },
  [InlineRegexSymbol_0_to_3]: { regexExpr: "[0-3]" },
  [InlineRegexSymbol_CapitalLetter]: { regexExpr: "[\\p{Lu}\\p{Lt}]", isUnicode: true, isCaseSensitive: true },
  [InlineRegexSymbol_LowercaseLetter]: { regexExpr: "\\p{Ll}", isUnicode: true, isCaseSensitive: true }
};
var inlineRegexSymbolsDetectionRegex = new RegExp(inlineRegexSymbolsArrEscapedForRegex.join("|"), "gi");
var hasMoreThanOneSortingSymbol = (s) => {
  sortingSymbolsRegex.lastIndex = 0;
  return sortingSymbolsRegex.test(s) && sortingSymbolsRegex.test(s);
};
var detectSortingSymbols = (s) => {
  sortingSymbolsRegex.lastIndex = 0;
  return sortingSymbolsRegex.test(s);
};
var detectInlineRegex = (s) => {
  inlineRegexSymbolsDetectionRegex.lastIndex = 0;
  return s ? inlineRegexSymbolsDetectionRegex.test(s) : false;
};
var extractSortingSymbol = (s) => {
  if (s) {
    sortingSymbolsRegex.lastIndex = 0;
    const matches = sortingSymbolsRegex.exec(s);
    return matches ? matches[0] : null;
  } else {
    return null;
  }
};
var RomanNumberNormalizerFn = (s) => getNormalizedRomanNumber(s);
var CompoundDotRomanNumberNormalizerFn = (s) => getNormalizedRomanNumber(s, DOT_SEPARATOR);
var CompoundDashRomanNumberNormalizerFn = (s) => getNormalizedRomanNumber(s, DASH_SEPARATOR);
var NumberNormalizerFn = (s) => getNormalizedNumber(s);
var CompoundDotNumberNormalizerFn = (s) => getNormalizedNumber(s, DOT_SEPARATOR);
var CompoundDashNumberNormalizerFn = (s) => getNormalizedNumber(s, DASH_SEPARATOR);
var Date_yyyy_mm_dd_NormalizerFn = (s) => getNormalizedDate_yyyy_mm_dd_NormalizerFn(s);
var Date_yyyy_dd_mm_NormalizerFn = (s) => getNormalizedDate_yyyy_dd_mm_NormalizerFn(s);
var Date_dd_Mmm_yyyy_NormalizerFn = (s) => getNormalizedDate_dd_Mmm_yyyy_NormalizerFn(s);
var Date_Mmm_dd_yyyy_NormalizerFn = (s) => getNormalizedDate_Mmm_dd_yyyy_NormalizerFn(s);
var Date_dd_mm_yyyy_NormalizerFn = (s) => getNormalizedDate_dd_mm_yyyy_NormalizerFn(s);
var Date_mm_dd_yyyy_NormalizerFn = (s) => getNormalizedDate_mm_dd_yyyy_NormalizerFn(s);
var Date_yyyy_Www_mm_dd_NormalizerFn = (s) => getNormalizedDate_yyyy_Www_mm_dd_NormalizerFn(s);
var Date_yyyy_WwwISO_NormalizerFn = (s) => getNormalizedDate_yyyy_WwwISO_NormalizerFn(s);
var Date_yyyy_Www_NormalizerFn = (s) => getNormalizedDate_yyyy_Www_NormalizerFn(s);
var sortingSymbolToRegexpStr = {
  [RomanNumberRegexSymbol.toLowerCase()]: {
    regexpStr: RomanNumberRegexStr,
    normalizerFn: RomanNumberNormalizerFn,
    advancedRegexType: 4 /* RomanNumber */
  },
  [CompoundRomanNumberDotRegexSymbol.toLowerCase()]: {
    regexpStr: CompoundRomanNumberDotRegexStr,
    normalizerFn: CompoundDotRomanNumberNormalizerFn,
    advancedRegexType: 5 /* CompoundDotRomanNumber */
  },
  [CompoundRomanNumberDashRegexSymbol.toLowerCase()]: {
    regexpStr: CompoundRomanNumberDashRegexStr,
    normalizerFn: CompoundDashRomanNumberNormalizerFn,
    advancedRegexType: 6 /* CompoundDashRomanNumber */
  },
  [NumberRegexSymbol.toLowerCase()]: {
    regexpStr: NumberRegexStr,
    normalizerFn: NumberNormalizerFn,
    advancedRegexType: 1 /* Number */
  },
  [CompoundNumberDotRegexSymbol.toLowerCase()]: {
    regexpStr: CompoundNumberDotRegexStr,
    normalizerFn: CompoundDotNumberNormalizerFn,
    advancedRegexType: 2 /* CompoundDotNumber */
  },
  [CompoundNumberDashRegexSymbol.toLowerCase()]: {
    regexpStr: CompoundNumberDashRegexStr,
    normalizerFn: CompoundDashNumberNormalizerFn,
    advancedRegexType: 3 /* CompoundDashNumber */
  },
  [WordInASCIIRegexSymbol]: {
    // Intentionally retain character case
    regexpStr: WordInASCIIRegexStr,
    normalizerFn: IdentityNormalizerFn,
    advancedRegexType: 7 /* WordInASCII */
  },
  [WordInAnyLanguageRegexSymbol]: {
    // Intentionally retain character case
    regexpStr: WordInAnyLanguageRegexStr,
    normalizerFn: IdentityNormalizerFn,
    advancedRegexType: 8 /* WordInAnyLanguage */,
    unicodeRegex: true
  },
  [Date_yyyy_mm_dd_RegexSymbol]: {
    // Intentionally retain character case
    regexpStr: Date_yyyy_mm_dd_RegexStr,
    normalizerFn: Date_yyyy_mm_dd_NormalizerFn,
    advancedRegexType: 9 /* Date_yyyy_mm_dd */
  },
  [Date_yyyy_dd_mm_RegexSymbol]: {
    // Intentionally retain character case
    regexpStr: Date_yyyy_dd_mm_RegexStr,
    normalizerFn: Date_yyyy_dd_mm_NormalizerFn,
    advancedRegexType: 10 /* Date_yyyy_dd_mm */
  },
  [Date_dd_Mmm_yyyy_RegexSymbol]: {
    // Intentionally retain character case
    regexpStr: Date_dd_Mmm_yyyy_RegexStr,
    normalizerFn: Date_dd_Mmm_yyyy_NormalizerFn,
    advancedRegexType: 11 /* Date_dd_Mmm_yyyy */
  },
  [Date_Mmm_dd_yyyy_RegexSymbol]: {
    // Intentionally retain character case
    regexpStr: Date_Mmm_dd_yyyy_RegexStr,
    normalizerFn: Date_Mmm_dd_yyyy_NormalizerFn,
    advancedRegexType: 12 /* Date_Mmm_dd_yyyy */
  },
  [Date_dd_mm_yyyy_RegexSymbol]: {
    // Intentionally retain character case
    regexpStr: Date_dd_mm_yyyy_RegexStr,
    normalizerFn: Date_dd_mm_yyyy_NormalizerFn,
    advancedRegexType: 13 /* Date_dd_mm_yyyy */
  },
  [Date_mm_dd_yyyy_RegexSymbol]: {
    // Intentionally retain character case
    regexpStr: Date_mm_dd_yyyy_RegexStr,
    normalizerFn: Date_mm_dd_yyyy_NormalizerFn,
    advancedRegexType: 14 /* Date_mm_dd_yyyy */
  },
  [Date_yyyy_Www_mm_dd_RegexSymbol]: {
    // Intentionally retain character case
    regexpStr: Date_yyyy_Www_mm_dd_RegexStr,
    normalizerFn: Date_yyyy_Www_mm_dd_NormalizerFn,
    advancedRegexType: 15 /* Date_yyyy_Www_mm_dd_yyyy */
  },
  [Date_yyyy_WwwISO_RegexSymbol]: {
    // Intentionally retain character case
    regexpStr: Date_yyyy_WwwISO_RegexStr,
    normalizerFn: Date_yyyy_WwwISO_NormalizerFn,
    advancedRegexType: 16 /* Date_yyyy_WwwISO */
  },
  [Date_yyyy_Www_RegexSymbol]: {
    // Intentionally retain character case
    regexpStr: Date_yyyy_Www_RegexStr,
    normalizerFn: Date_yyyy_Www_NormalizerFn,
    advancedRegexType: 17 /* Date_yyyy_Www */
  }
};
var convertPlainStringToLeftRegex = (s) => {
  return convertPlainStringToRegex(s, 1 /* Prefix */);
};
var convertPlainStringToRightRegex = (s) => {
  return convertPlainStringToRegex(s, 2 /* Suffix */);
};
var convertPlainStringToFullMatchRegex = (s) => {
  return convertPlainStringToRegex(s, 3 /* FullMatch */);
};
var convertPlainStringToRegex = (s, actAs) => {
  const regexMatchesStart = [1 /* Prefix */, 3 /* FullMatch */].includes(actAs);
  const regexMatchesEnding = [2 /* Suffix */, 3 /* FullMatch */].includes(actAs);
  const detectedSymbol = extractSortingSymbol(s);
  if (detectedSymbol) {
    const replacement = sortingSymbolToRegexpStr[detectedSymbol] ?? sortingSymbolToRegexpStr[detectedSymbol.toLowerCase()];
    const [extractedPrefix, extractedSuffix] = s.split(detectedSymbol);
    const regexPrefix = regexMatchesStart ? "^" : "";
    const regexSuffix = regexMatchesEnding ? "$" : "";
    const escapedProcessedPrefix = convertInlineRegexSymbolsAndEscapeTheRest(extractedPrefix);
    const escapedProcessedSuffix = convertInlineRegexSymbolsAndEscapeTheRest(extractedSuffix);
    const regexUnicode = !!replacement.unicodeRegex || !!escapedProcessedPrefix.isUnicodeRegex || !!escapedProcessedSuffix.isUnicodeRegex;
    const regexCaseSensitive = !!escapedProcessedPrefix.isCaseSensitiveRegex || !!escapedProcessedSuffix.isCaseSensitiveRegex;
    const regexFlags = `${regexUnicode ? "u" : ""}${regexCaseSensitive ? "" : "i"}`;
    return {
      regexpSpec: {
        regex: new RegExp(`${regexPrefix}${escapedProcessedPrefix.s}${replacement.regexpStr}${escapedProcessedSuffix.s}${regexSuffix}`, regexFlags),
        normalizerFn: replacement.normalizerFn
      },
      prefix: extractedPrefix,
      suffix: extractedSuffix,
      containsAdvancedRegex: replacement.advancedRegexType
    };
  } else if (detectInlineRegex(s)) {
    const replacement = convertInlineRegexSymbolsAndEscapeTheRest(s);
    const regexPrefix = regexMatchesStart ? "^" : "";
    const regexSuffix = regexMatchesEnding ? "$" : "";
    const regexFlags = `${replacement.isUnicodeRegex ? "u" : ""}${replacement.isCaseSensitiveRegex ? "" : "i"}`;
    return {
      regexpSpec: {
        regex: new RegExp(`${regexPrefix}${replacement.s}${regexSuffix}`, regexFlags)
      },
      prefix: "",
      // shouldn't be used anyway because of the below containsAdvancedRegex: false
      suffix: "",
      // ---- // ----
      containsAdvancedRegex: 0 /* None */
    };
  } else {
    return null;
  }
};
var convertInlineRegexSymbolsAndEscapeTheRest = (s) => {
  if (s === "") {
    return {
      s
    };
  }
  let regexAsString = [];
  let isUnicode = false;
  let isCaseSensitive = false;
  while (s.length > 0) {
    let earliestRegexSymbolIdx = void 0;
    let earliestRegexSymbol = void 0;
    for (let inlineRegexSymbol of Object.keys(inlineRegexSymbolsToRegexExpressionsArr)) {
      const index = s.indexOf(inlineRegexSymbol);
      if (index >= 0) {
        if (earliestRegexSymbolIdx !== void 0) {
          if (index < earliestRegexSymbolIdx) {
            earliestRegexSymbolIdx = index;
            earliestRegexSymbol = inlineRegexSymbol;
          }
        } else {
          earliestRegexSymbolIdx = index;
          earliestRegexSymbol = inlineRegexSymbol;
        }
      }
    }
    if (earliestRegexSymbolIdx !== void 0) {
      if (earliestRegexSymbolIdx > 0) {
        const charsBeforeRegexSymbol = s.substring(0, earliestRegexSymbolIdx);
        regexAsString.push(escapeRegexUnsafeCharacters(charsBeforeRegexSymbol));
        s = s.substring(earliestRegexSymbolIdx);
      }
      const expr = inlineRegexSymbolsToRegexExpressionsArr[earliestRegexSymbol];
      regexAsString.push(expr.regexExpr);
      isUnicode ||= !!expr.isUnicode;
      isCaseSensitive ||= !!expr.isCaseSensitive;
      s = s.substring(earliestRegexSymbol.length);
    } else {
      regexAsString.push(escapeRegexUnsafeCharacters(s));
      s = "";
    }
  }
  return {
    s: regexAsString.join(""),
    isUnicodeRegex: isUnicode,
    isCaseSensitiveRegex: isCaseSensitive
  };
};
var MatchFolderNameLexeme = "name:";
var MatchFolderByRegexpLexeme = "regexp:";
var RegexpAgainstFolderName = "for-name:";
var DebugFolderRegexMatchesLexeme = "debug:";
var ensureCollectionHasSortSpecByPath = (collection) => {
  collection ??= {};
  if (!collection.sortSpecByPath) {
    collection.sortSpecByPath = {};
  }
  return collection;
};
var ensureCollectionHasSortSpecByName = (collection) => {
  collection ??= {};
  if (!collection.sortSpecByName) {
    collection.sortSpecByName = {};
  }
  return collection;
};
var ensureCollectionHasSortSpecByWildcard = (collection) => {
  collection ??= {};
  if (!collection.sortSpecByWildcard) {
    collection.sortSpecByWildcard = new FolderWildcardMatching((spec) => !!spec.implicit);
  }
  return collection;
};
var checkAdjacency = (sortingSymbolInfo) => {
  return {
    noPrefix: sortingSymbolInfo.prefix.length === 0,
    noSuffix: sortingSymbolInfo.suffix.length === 0
  };
};
var endsWithWildcardPatternSuffix = (path2) => {
  return path2.endsWith(MATCH_CHILDREN_1_SUFFIX) || path2.endsWith(MATCH_CHILDREN_2_SUFFIX) || path2.endsWith(MATCH_ALL_SUFFIX);
};
var stripWildcardPatternSuffix = (path2, ofImplicitSpec) => {
  if (path2.endsWith(MATCH_ALL_SUFFIX)) {
    path2 = path2.slice(0, -MATCH_ALL_SUFFIX.length);
    return {
      path: path2.length > 0 ? path2 : "/",
      detectedWildcardPriority: ofImplicitSpec ? 6 /* MATCH_ALL_IMPLICIT */ : 4 /* MATCH_ALL */
    };
  }
  if (path2.endsWith(MATCH_CHILDREN_1_SUFFIX)) {
    path2 = path2.slice(0, -MATCH_CHILDREN_1_SUFFIX.length);
    return {
      path: path2.length > 0 ? path2 : "/",
      detectedWildcardPriority: ofImplicitSpec ? 5 /* MATCH_CHILDREN_IMPLICIT */ : 3 /* MATCH_CHILDREN */
    };
  }
  if (path2.endsWith(MATCH_CHILDREN_2_SUFFIX)) {
    path2 = path2.slice(0, -MATCH_CHILDREN_2_SUFFIX.length);
    return {
      path: path2.length > 0 ? path2 : "/",
      detectedWildcardPriority: ofImplicitSpec ? 5 /* MATCH_CHILDREN_IMPLICIT */ : 3 /* MATCH_CHILDREN */
    };
  }
  return {
    path: path2,
    detectedWildcardPriority: ofImplicitSpec ? 2 /* NO_WILDCARD_IMPLICIT */ : 1 /* NO_WILDCARD */
  };
};
var eatPrefixIfPresent = (expression, prefix, onDetected) => {
  const detected = expression.startsWith(prefix);
  if (detected) {
    onDetected();
    return expression.substring(prefix.length).trim();
  } else {
    return expression;
  }
};
var consumeFolderByRegexpExpression = (expression) => {
  let againstName = false;
  let priority;
  let logMatches;
  let nextRoundNeeded;
  do {
    nextRoundNeeded = false;
    expression = eatPrefixIfPresent(expression, RegexpAgainstFolderName, () => {
      againstName = true;
      nextRoundNeeded = true;
    });
    for (const priorityPrefix of Object.keys(TargetFolderRegexpPriorityPrefixes)) {
      let doBreak = false;
      expression = eatPrefixIfPresent(expression, priorityPrefix, () => {
        priority = TargetFolderRegexpPriorityPrefixes[priorityPrefix];
        nextRoundNeeded = true;
        doBreak = true;
      });
      if (doBreak) {
        break;
      }
    }
    expression = eatPrefixIfPresent(expression, DebugFolderRegexMatchesLexeme, () => {
      logMatches = true;
      nextRoundNeeded = true;
    });
  } while (nextRoundNeeded);
  if (!expression || expression.trim() === "") {
    throw new Error("Empty regexp");
  }
  return {
    regexp: new RegExp(expression),
    againstName,
    priority: priority === void 0 ? NO_PRIORITY : priority,
    log: !!logMatches
  };
};
var AttrError = class {
  constructor(errorMsg) {
    this.errorMsg = errorMsg;
  }
  errorMsg;
};
var extractIdentifier = (text, defaultResult) => {
  const identifier = text.trim().split(" ")?.[0]?.trim();
  return identifier ? identifier : defaultResult;
};
var ADJACENCY_ERROR = "Sorting symbol must not be directly adjacent to a wildcard because of potential performance problem. An additional explicit separator helps in such case.";
var SortingSpecProcessor = class {
  // Logger parameter exposed to support unit testing of error cases as well as capturing error messages
  //  for in-app presentation
  constructor(errorLogger) {
    this.errorLogger = errorLogger;
  }
  errorLogger;
  ctx;
  currentEntryLine;
  currentEntryLineIdx;
  currentSortingSpecContainerFilePath;
  problemAlreadyReportedForCurrentLine;
  recentErrorMessage;
  // Helper map to deal with rule priorities for the same path
  //   and also detect non-wildcard duplicates.
  //   The wildcard duplicates were detected prior to this point, no need to bother about them
  pathMatchPriorityForPath = {};
  // root level parser function
  parseSortSpecFromText(text, folderPath, sortingSpecFileName, collection, implicitSpec) {
    this.ctx = {
      folderPath,
      // location of the sorting spec file
      specs: [],
      implicitSpec
    };
    this.currentEntryLine = null;
    this.currentEntryLineIdx = null;
    this.currentSortingSpecContainerFilePath = null;
    this.problemAlreadyReportedForCurrentLine = null;
    this.recentErrorMessage = null;
    let success = false;
    let lineIdx = 0;
    for (let entryLine of text) {
      lineIdx++;
      this.currentEntryLine = entryLine;
      this.currentEntryLineIdx = lineIdx;
      this.currentSortingSpecContainerFilePath = `${folderPath === "/" ? "" : folderPath}/${sortingSpecFileName}`;
      this.problemAlreadyReportedForCurrentLine = false;
      const trimmedEntryLine = entryLine.trim();
      if (trimmedEntryLine === "") continue;
      if (trimmedEntryLine.startsWith(CommentPrefix)) continue;
      success = false;
      const attr = this.parseAttribute(entryLine);
      if (attr) {
        success = this.processParsedSortingAttribute(attr);
        this.ctx.previousValidEntryWasTargetFolderAttr = success && attr.attribute === 1 /* TargetFolder */;
      } else if (!this.problemAlreadyReportedForCurrentLine && !this.checkForRiskyAttrSyntaxError(entryLine)) {
        let group = this.parseSortingGroupSpec(entryLine);
        if (!this.problemAlreadyReportedForCurrentLine && !group) {
          group = { plainSpec: trimmedEntryLine };
        }
        if (group) {
          success = this.processParsedSortGroupSpec(group);
        }
        this.ctx.previousValidEntryWasTargetFolderAttr = void 0;
      }
      if (!success) {
        if (!this.problemAlreadyReportedForCurrentLine) {
          this.problem(0 /* SyntaxError */, "Sorting specification line doesn't match any supported syntax");
        }
        break;
      }
    }
    if (success) {
      if (this.ctx.specs.length > 0) {
        for (let spec of this.ctx.specs) {
          if (!this.postprocessSortSpec(spec)) {
            return null;
          }
        }
        for (let spec of this.ctx.specs) {
          for (let idx = 0; idx < spec.targetFoldersPaths.length; idx++) {
            const path2 = spec.targetFoldersPaths[idx];
            if (path2.startsWith(MatchFolderNameLexeme)) {
              const folderNameToMatch = path2.substring(MatchFolderNameLexeme.length).trim();
              if (folderNameToMatch === "") {
                this.problem(
                  26 /* EmptyFolderNameToMatch */,
                  `Empty '${TargetFolderLexeme} ${MatchFolderNameLexeme}' value`
                );
                return null;
              }
              collection = ensureCollectionHasSortSpecByName(collection);
              if (collection.sortSpecByName[folderNameToMatch]) {
                this.problem(
                  25 /* DuplicateByNameSortSpecForFolder */,
                  `Duplicate '${TargetFolderLexeme} ${MatchFolderNameLexeme}' definition for the same name <${folderNameToMatch}>`
                );
                return null;
              } else {
                collection.sortSpecByName[folderNameToMatch] = spec;
              }
            }
          }
        }
        for (let spec of this.ctx.specs) {
          for (let idx = 0; idx < spec.targetFoldersPaths.length; idx++) {
            const path2 = spec.targetFoldersPaths[idx];
            if (path2.startsWith(MatchFolderByRegexpLexeme)) {
              collection = ensureCollectionHasSortSpecByWildcard(collection);
              const folderByRegexpExpression = path2.substring(MatchFolderByRegexpLexeme.length).trim();
              try {
                const r = consumeFolderByRegexpExpression(folderByRegexpExpression);
                collection.sortSpecByWildcard.addRegexpDefinition(r.regexp, r.againstName, r.priority, r.log, spec);
              } catch (e) {
                this.problem(
                  27 /* InvalidOrEmptyFolderMatchingRegexp */,
                  `Invalid or empty folder regexp expression <${folderByRegexpExpression}>`
                );
                return null;
              }
            } else if (endsWithWildcardPatternSuffix(path2)) {
              collection = ensureCollectionHasSortSpecByWildcard(collection);
              const ruleAdded = collection.sortSpecByWildcard.addWildcardDefinition(path2, spec);
              if (ruleAdded?.errorMsg) {
                this.problem(13 /* DuplicateWildcardSortSpecForSameFolder */, ruleAdded?.errorMsg);
                return null;
              }
            }
          }
        }
        for (let spec of this.ctx.specs) {
          for (let idx = 0; idx < spec.targetFoldersPaths.length; idx++) {
            const originalPath = spec.targetFoldersPaths[idx];
            if (!originalPath.startsWith(MatchFolderNameLexeme) && !originalPath.startsWith(MatchFolderByRegexpLexeme)) {
              const { path: path2, detectedWildcardPriority } = stripWildcardPatternSuffix(originalPath, !!spec.implicit);
              let storeTheSpec = true;
              const preexistingSortSpecPriority = this.pathMatchPriorityForPath[path2];
              if (preexistingSortSpecPriority) {
                if (preexistingSortSpecPriority === 1 /* NO_WILDCARD */ && detectedWildcardPriority === 1 /* NO_WILDCARD */) {
                  this.problem(2 /* DuplicateSortSpecForSameFolder */, `Duplicate sorting spec for folder ${path2}`);
                  return null;
                } else if (detectedWildcardPriority >= preexistingSortSpecPriority) {
                  storeTheSpec = false;
                }
              }
              if (storeTheSpec) {
                collection = ensureCollectionHasSortSpecByPath(collection);
                collection.sortSpecByPath[path2] = spec;
                this.pathMatchPriorityForPath[path2] = detectedWildcardPriority;
              }
            }
          }
        }
      }
      return collection;
    } else {
      return null;
    }
  }
  problem = (code, details) => {
    const problemLabel = ProblemCode[code];
    let logger = this.errorLogger ?? console.error;
    const hasLineContext = !ContextFreeProblems.has(code);
    const lineContext = hasLineContext ? ` line ${this.currentEntryLineIdx} of` : "";
    logger(`Sorting specification problem: ${code}:${problemLabel} ${details} ---encountered in${lineContext} sorting spec in file ${this.currentSortingSpecContainerFilePath}`);
    if (lineContext) {
      logger(`Content of problematic line: "${this.currentEntryLine}"`);
    }
    this.recentErrorMessage = `File: ${this.currentSortingSpecContainerFilePath}
` + (hasLineContext ? `Specification line #${this.currentEntryLineIdx}: "${this.currentEntryLine}"
` : "") + `Problem: ${code}:${problemLabel}
Details: ${details}`;
    this.problemAlreadyReportedForCurrentLine = true;
  };
  // level 1 parser functions defined in order of occurrence and dependency
  parseAttribute = (line) => {
    const lineTrimmedStart = line.trimStart();
    const nestingLevel = line.length - lineTrimmedStart.length;
    const indexOfSpace = lineTrimmedStart.indexOf(" ");
    if (indexOfSpace === -1) {
      return null;
    }
    const firstLexeme = lineTrimmedStart.substring(0, indexOfSpace);
    const firstLexemeLowerCase = firstLexeme.toLowerCase();
    const recognizedAttr = AttrLexemes[firstLexemeLowerCase];
    if (recognizedAttr) {
      const attrValue = lineTrimmedStart.substring(indexOfSpace).trim();
      if (attrValue) {
        const validator = this.attrValueValidators[recognizedAttr];
        if (validator) {
          const validValue = validator(attrValue, recognizedAttr, firstLexeme);
          if (validValue instanceof AttrError) {
            this.problem(7 /* InvalidAttributeValue */, validValue.errorMsg || ErrorMsgForAttribute[recognizedAttr]);
          } else if (validValue) {
            return {
              nesting: nestingLevel,
              attribute: recognizedAttr,
              value: validValue
            };
          } else {
            this.problem(7 /* InvalidAttributeValue */, ErrorMsgForAttribute[recognizedAttr]);
          }
        } else {
          return {
            nesting: nestingLevel,
            attribute: recognizedAttr,
            value: attrValue
          };
        }
      } else {
        this.problem(5 /* MissingAttributeValue */, `${ErrorMsgForAttribute[recognizedAttr]}: "${firstLexeme}" requires a value to follow`);
      }
    }
    return null;
  };
  processParsedSortingAttribute(attr) {
    if (attr.attribute === 1 /* TargetFolder */) {
      if (attr.nesting === 0) {
        if (this.ctx.previousValidEntryWasTargetFolderAttr) {
          if (this.ctx.currentSpec) {
            this.ctx.currentSpec.targetFoldersPaths.push(attr.value);
          } else {
            this.ctx.currentSpec = this.putNewSpecForNewTargetFolder(attr.value);
          }
        } else {
          this.ctx.currentSpec = this.putNewSpecForNewTargetFolder(attr.value);
        }
        return true;
      } else {
        this.problem(8 /* TargetFolderNestedSpec */, `Nested (indented) specification of target folder is not allowed`);
        return false;
      }
    } else if (attr.attribute === 2 /* OrderAsc */ || attr.attribute === 3 /* OrderDesc */ || attr.attribute === 4 /* OrderUnspecified */) {
      if (attr.nesting === 0) {
        if (!this.ctx.currentSpec) {
          this.ctx.currentSpec = this.putNewSpecForNewTargetFolder();
        }
        if (this.ctx.currentSpec.defaultSorting) {
          const folderPathsForProblemMsg = this.ctx.currentSpec.targetFoldersPaths.join(" :: ");
          this.problem(3 /* DuplicateOrderAttr */, `Duplicate order specification for folder(s) ${folderPathsForProblemMsg}`);
          return false;
        }
        const rs = attr.value;
        this.ctx.currentSpec.defaultSorting = rs.primary;
        this.ctx.currentSpec.defaultSecondarySorting = rs.secondary;
        return true;
      } else if (attr.nesting > 0) {
        if (!this.ctx.currentSpec || !this.ctx.currentSpecGroup) {
          this.problem(4 /* DanglingOrderAttr */, `Nested (indented) attribute requires prior sorting group definition`);
          return false;
        }
        if (this.ctx.currentSpecGroup.sorting) {
          const folderPathsForProblemMsg = this.ctx.currentSpec.targetFoldersPaths.join(" :: ");
          this.problem(3 /* DuplicateOrderAttr */, `Duplicate order specification for a sorting rule of folder ${folderPathsForProblemMsg}`);
          return false;
        }
        const rs = attr.value;
        this.ctx.currentSpecGroup.sorting = rs.primary;
        this.ctx.currentSpecGroup.secondarySorting = rs.secondary;
        return true;
      }
    }
    return false;
  }
  checkForRiskyAttrSyntaxError = (line) => {
    const lineTrimmedStart = line.trimStart();
    const lineTrimmedStartLowerCase = lineTrimmedStart.toLowerCase();
    for (let attrLexeme of Object.keys(AttrLexemes)) {
      if (lineTrimmedStartLowerCase.startsWith(attrLexeme)) {
        const originalAttrLexeme = lineTrimmedStart.substring(0, attrLexeme.length);
        if (lineTrimmedStartLowerCase.length === attrLexeme.length) {
          this.problem(5 /* MissingAttributeValue */, `Attribute "${originalAttrLexeme}" requires a value to follow`);
          return true;
        } else {
          this.problem(6 /* NoSpaceBetweenAttributeAndValue */, `Space required after attribute name "${originalAttrLexeme}"`);
          return true;
        }
      }
    }
    return false;
  };
  parseSortingGroupSpec = (line) => {
    let s = line.trim();
    if (hasMoreThanOneSortingSymbol(s)) {
      this.problem(9 /* TooManySortingSymbols */, "Maximum one sorting symbol allowed per line");
      return null;
    }
    if (containsThreeDots(s)) {
      const [prefix, suffix] = s.split(ThreeDots);
      if (containsThreeDots(prefix) && containsThreeDots(suffix)) {
        this.problem(24 /* InlineRegexInPrefixAndSuffix */, "In current version, inline regex symbols are not allowed both in prefix and suffix.");
        return null;
      }
    }
    let groupPriority = void 0;
    let groupPriorityPrefixesCount = 0;
    let combineGroup = void 0;
    let combineGroupPrefixesCount = 0;
    let groupType = void 0;
    let groupTypePrefixesCount = 0;
    let priorityPrefixAfterGroupTypePrefix = false;
    let combinePrefixAfterGroupTypePrefix = false;
    let prefixRecognized = void 0;
    while (prefixRecognized === void 0 || prefixRecognized) {
      let doContinue = false;
      for (const priorityPrefix of Object.keys(SortingGroupPriorityPrefixes)) {
        if (s === priorityPrefix || s.startsWith(priorityPrefix + " ")) {
          groupPriority = SortingGroupPriorityPrefixes[priorityPrefix];
          groupPriorityPrefixesCount++;
          prefixRecognized = true;
          doContinue = true;
          if (groupType) {
            priorityPrefixAfterGroupTypePrefix = true;
          }
          s = s.substring(priorityPrefix.length).trim();
          break;
        }
      }
      if (doContinue) continue;
      for (let combinePrefix of CombiningGroupPrefixes) {
        if (s === combinePrefix || s.startsWith(combinePrefix + " ")) {
          combineGroup = true;
          combineGroupPrefixesCount++;
          prefixRecognized = true;
          doContinue = true;
          if (groupType) {
            combinePrefixAfterGroupTypePrefix = true;
          }
          s = s.substring(combinePrefix.length).trim();
          break;
        }
      }
      if (doContinue) continue;
      for (const sortingGroupTypePrefix of Object.keys(SortingGroupPrefixes)) {
        if (s === sortingGroupTypePrefix || s.startsWith(sortingGroupTypePrefix + " ")) {
          groupType = SortingGroupPrefixes[sortingGroupTypePrefix];
          groupTypePrefixesCount++;
          prefixRecognized = true;
          doContinue = true;
          s = s.substring(sortingGroupTypePrefix.length).trim();
          break;
        }
      }
      if (doContinue) continue;
      prefixRecognized = false;
    }
    if (groupPriorityPrefixesCount > 1) {
      this.problem(16 /* TooManyPriorityPrefixes */, "Only one priority prefix allowed on sorting group");
      return null;
    }
    if (s === "" && groupPriority) {
      this.problem(15 /* PriorityNotAllowedOnOutsidersGroup */, "Priority is not allowed for sorting group with empty match-pattern");
      return null;
    }
    if (combineGroupPrefixesCount > 1) {
      this.problem(18 /* TooManyCombinePrefixes */, "Only one combining prefix allowed on sorting group");
      return null;
    }
    if (s === "" && combineGroup) {
      this.problem(17 /* CombiningNotAllowedOnOutsidersGroup */, "Combining is not allowed for sorting group with empty match-pattern");
      return null;
    }
    if (groupTypePrefixesCount > 1) {
      this.problem(21 /* TooManyGroupTypePrefixes */, "Only one sorting group type prefix allowed on sorting group");
      return null;
    }
    if (priorityPrefixAfterGroupTypePrefix) {
      this.problem(22 /* PriorityPrefixAfterGroupTypePrefix */, "Priority prefix must be used before sorting group type indicator");
      return null;
    }
    if (combinePrefixAfterGroupTypePrefix) {
      this.problem(23 /* CombinePrefixAfterGroupTypePrefix */, "Combining prefix must be used before sorting group type indicator");
      return null;
    }
    if (s === "" && groupType) {
      if (groupType.itemToHide) {
        this.problem(11 /* ItemToHideExactNameWithExtRequired */, "Exact name with ext of file or folders to hide is required");
        return null;
      } else {
        return {
          outsidersGroup: true,
          filesOnly: groupType.filesOnly,
          foldersOnly: groupType.foldersOnly
        };
      }
    }
    if (groupType) {
      if (groupType.itemToHide) {
        return {
          itemToHide: true,
          plainSpec: s,
          filesOnly: groupType.filesOnly,
          foldersOnly: groupType.foldersOnly
        };
      } else {
        return {
          plainSpec: s,
          filesOnly: groupType.filesOnly,
          foldersOnly: groupType.foldersOnly,
          matchFilenameWithExt: groupType.filenameWithExt,
          priority: groupPriority ?? void 0,
          combine: combineGroup
        };
      }
    }
    if ((groupPriority || combineGroup) && s !== "") {
      return {
        plainSpec: s,
        priority: groupPriority,
        combine: combineGroup
      };
    }
    return null;
  };
  // Artificial value used to indicate not-undefined value in if (COMBINING_INDICATOR_IDX) { ... }
  COMBINING_INDICATOR_IDX = -1;
  processParsedSortGroupSpec(group) {
    if (!this.ctx.currentSpec) {
      this.ctx.currentSpec = this.putNewSpecForNewTargetFolder();
    }
    if (group.plainSpec) {
      group.arraySpec = this.convertPlainStringSortingGroupSpecToArraySpec(group.plainSpec);
      delete group.plainSpec;
    }
    if (group.itemToHide) {
      if (!this.consumeParsedItemToHide(group)) {
        this.problem(12 /* ItemToHideNoSupportForThreeDots */, "For hiding of file or folder, the exact name with ext is required and no sorting symbols allowed");
        return false;
      } else {
        return true;
      }
    } else {
      const newGroup = this.consumeParsedSortingGroupSpec(group);
      if (newGroup) {
        if (this.adjustSortingGroupForSortingSymbol(newGroup)) {
          if (this.ctx.currentSpec) {
            const groupIdx = this.ctx.currentSpec.groups.push(newGroup) - 1;
            this.ctx.currentSpecGroup = newGroup;
            if (group.priority && group.priority > 0) {
              newGroup.priority = group.priority;
              this.addExpediteGroupInfo(this.ctx.currentSpec, group.priority, groupIdx);
            }
            if (group.combine) {
              newGroup.combineWithIdx = this.COMBINING_INDICATOR_IDX;
            }
            return true;
          } else {
            return false;
          }
        } else {
          return false;
        }
      } else {
        return false;
      }
    }
  }
  postprocessSortSpec(spec) {
    spec.outsidersGroupIdx = void 0;
    spec.outsidersFilesGroupIdx = void 0;
    spec.outsidersFoldersGroupIdx = void 0;
    let outsidersGroupForFolders;
    let outsidersGroupForFiles;
    for (let groupIdx = 0; groupIdx < spec.groups.length; groupIdx++) {
      const group = spec.groups[groupIdx];
      if (group.type === 0 /* Outsiders */) {
        if (group.filesOnly) {
          if (isDefined(spec.outsidersFilesGroupIdx)) {
            console.warn(`Ignoring duplicate Outsiders-files sorting group definition in sort spec for folder '${last(spec.targetFoldersPaths)}'`);
          } else {
            spec.outsidersFilesGroupIdx = groupIdx;
            outsidersGroupForFiles = true;
          }
        } else if (group.foldersOnly) {
          if (isDefined(spec.outsidersFoldersGroupIdx)) {
            console.warn(`Ignoring duplicate Outsiders-folders sorting group definition in sort spec for folder '${last(spec.targetFoldersPaths)}'`);
          } else {
            spec.outsidersFoldersGroupIdx = groupIdx;
            outsidersGroupForFolders = true;
          }
        } else {
          if (isDefined(spec.outsidersGroupIdx)) {
            console.warn(`Ignoring duplicate Outsiders sorting group definition in sort spec for folder '${last(spec.targetFoldersPaths)}'`);
          } else {
            spec.outsidersGroupIdx = groupIdx;
            outsidersGroupForFolders = true;
            outsidersGroupForFiles = true;
          }
        }
      }
    }
    if (isDefined(spec.outsidersGroupIdx) && (isDefined(spec.outsidersFilesGroupIdx) || isDefined(spec.outsidersFoldersGroupIdx))) {
      console.warn(`Inconsistent Outsiders sorting group definition in sort spec for folder '${last(spec.targetFoldersPaths)}'`);
    }
    if (!(outsidersGroupForFiles && outsidersGroupForFolders)) {
      spec.outsidersGroupIdx = spec.groups.length;
      spec.groups.push({
        type: 0 /* Outsiders */
      });
    }
    let anyCombinedGroupPresent = false;
    let currentCombinedGroupIdx = void 0;
    for (let i = 0; i < spec.groups.length; i++) {
      const group = spec.groups[i];
      if (group.combineWithIdx === this.COMBINING_INDICATOR_IDX) {
        if (currentCombinedGroupIdx === void 0) {
          currentCombinedGroupIdx = i;
        } else {
          if (spec.groups[i - 1].sorting) {
            this.problem(20 /* OnlyLastCombinedGroupCanSpecifyOrder */, "Predecessor group of combined group cannot contain order specification. Put it at the last of group in combined groups");
            return false;
          }
        }
        group.combineWithIdx = currentCombinedGroupIdx;
        anyCombinedGroupPresent = true;
      } else {
        currentCombinedGroupIdx = void 0;
      }
    }
    if (anyCombinedGroupPresent) {
      let sortingForCombinedGroup;
      let secondarySortingForCombinedGroup;
      let idxOfCurrentCombinedGroup = void 0;
      for (let i = spec.groups.length - 1; i >= 0; i--) {
        const group = spec.groups[i];
        if (group.combineWithIdx !== void 0) {
          if (group.combineWithIdx === idxOfCurrentCombinedGroup) {
            group.sorting = sortingForCombinedGroup;
            group.secondarySorting = secondarySortingForCombinedGroup;
          } else {
            idxOfCurrentCombinedGroup = group.combineWithIdx;
            sortingForCombinedGroup = group.sorting;
            secondarySortingForCombinedGroup = group.secondarySorting;
          }
        } else {
          idxOfCurrentCombinedGroup = void 0;
          sortingForCombinedGroup = void 0;
          secondarySortingForCombinedGroup = void 0;
        }
      }
    }
    if (spec.priorityOrder) {
      for (let idx = 0; idx < spec.groups.length; idx++) {
        const group = spec.groups[idx];
        if (group.priority === void 0 && group.type !== 0 /* Outsiders */) {
          spec.priorityOrder.push(idx);
        }
      }
    }
    const CURRENT_FOLDER_PREFIX = `${CURRENT_FOLDER_SYMBOL}/`;
    spec.targetFoldersPaths.forEach((path2, idx) => {
      if (path2 === CURRENT_FOLDER_SYMBOL) {
        spec.targetFoldersPaths[idx] = this.ctx.folderPath;
      } else if (path2.startsWith(CURRENT_FOLDER_PREFIX)) {
        spec.targetFoldersPaths[idx] = `${this.ctx.folderPath}/${path2.substring(CURRENT_FOLDER_PREFIX.length)}`;
      }
    });
    return true;
  }
  // level 2 parser functions defined in order of occurrence and dependency
  validateTargetFolderAttrValue = (v, attr, attrLexeme) => {
    if (v) {
      const trimmed = v.trim();
      return trimmed || null;
    } else {
      return null;
    }
  };
  internalValidateOrderAttrValue = (sortOrderSpecText, prefixLexeme) => {
    if (sortOrderSpecText.indexOf(CommentPrefix) >= 0) {
      sortOrderSpecText = sortOrderSpecText.substring(0, sortOrderSpecText.indexOf(CommentPrefix));
    }
    const sortLevels = `${prefixLexeme || ""} ${sortOrderSpecText}`.trim().split(OrderLevelsSeparator);
    let sortOrderSpec = [];
    for (let level = 0; level <= MAX_SORT_LEVEL && level < sortLevels.length; level++) {
      let orderNameForErrorMsg = level === 0 ? "Primary" : "Secondary";
      let orderSpec = sortLevels[level].trim();
      let applyToMetadata = false;
      const hasDirectionPrefix = startsWithOrderAttrLexeme(orderSpec);
      orderSpec = hasDirectionPrefix ? orderSpec.substring(hasDirectionPrefix.lexeme.length).trim() : orderSpec;
      let orderName = startsWithOrderNameLiteral(orderSpec);
      orderSpec = orderName ? orderSpec.substring(orderName.literal.length).trim() : orderSpec;
      const hasDirectionPostfix = orderName ? startsWithOrderAttrLexeme(orderSpec, true) : void 0;
      orderSpec = hasDirectionPostfix ? orderSpec.substring(hasDirectionPostfix.lexeme.length).trim() : orderSpec;
      let metadataName;
      let metadataExtractor;
      if (orderSpec.startsWith(OrderByMetadataLexeme)) {
        applyToMetadata = true;
        const metadataNameAndOptionalExtractorSpec = orderSpec.substring(OrderByMetadataLexeme.length).trim() || void 0;
        if (metadataNameAndOptionalExtractorSpec) {
          if (metadataNameAndOptionalExtractorSpec.indexOf(ValueExtractorLexeme) > -1) {
            const metadataSpec = metadataNameAndOptionalExtractorSpec.split(ValueExtractorLexeme);
            metadataName = metadataSpec.shift()?.trim();
            const metadataExtractorSpec = metadataSpec?.shift()?.trim();
            const hasMetadataExtractor = metadataExtractorSpec ? tryParseAsMDataExtractorSpec(metadataExtractorSpec) : void 0;
            if (hasMetadataExtractor) {
              metadataExtractor = hasMetadataExtractor.m;
            } else {
              return new AttrError(`${orderNameForErrorMsg} sorting order contains unrecognized value extractor: >>> ${metadataExtractorSpec} <<<`);
            }
            orderSpec = "";
          } else {
            metadataName = metadataNameAndOptionalExtractorSpec;
            orderSpec = "";
          }
        } else {
          orderSpec = "";
        }
      }
      const superfluousText = orderSpec.trim() || void 0;
      if (superfluousText) {
        return new AttrError(`${orderNameForErrorMsg} sorting order contains unrecognized text: >>> ${superfluousText} <<<`);
      }
      if (hasDirectionPrefix && hasDirectionPostfix) {
        if (hasDirectionPrefix.attr !== 4 /* OrderUnspecified */ && hasDirectionPostfix.attr !== 4 /* OrderUnspecified */) {
          if (hasDirectionPrefix.attr !== hasDirectionPostfix.attr) {
            return new AttrError(`${orderNameForErrorMsg} sorting direction ${hasDirectionPrefix.lexeme} and ${hasDirectionPostfix.lexeme} are contradicting`);
          }
        }
      }
      let order;
      if (orderName) {
        const direction = hasDirectionPrefix ? hasDirectionPrefix.attr : hasDirectionPostfix ? hasDirectionPostfix.attr : 2 /* OrderAsc */;
        switch (direction) {
          case 2 /* OrderAsc */:
            order = orderName.order.asc;
            break;
          case 3 /* OrderDesc */:
            order = orderName.order.desc;
            break;
          case 4 /* OrderUnspecified */:
            if (hasDirectionPostfix) {
              order = hasDirectionPostfix.attr === 2 /* OrderAsc */ ? orderName.order.asc : orderName.order.desc;
            } else {
              order = orderName.order.asc;
            }
            break;
          default:
            order = void 0;
        }
        if (applyToMetadata) {
          if (order) {
            order = OrdersSupportedByMetadata[order];
          }
          if (!order) {
            return new AttrError(`Sorting by metadata requires one of alphabetical orders`);
          }
        }
      } else {
        return null;
      }
      sortOrderSpec[level] = {
        order,
        byMetadata: metadataName,
        metadataValueExtractor: metadataExtractor
      };
    }
    return sortOrderSpec;
  };
  validateOrderAttrValue = (v, attr, attrLexeme) => {
    const recognized = this.internalValidateOrderAttrValue(v, attrLexeme);
    return recognized ? recognized instanceof AttrError ? recognized : {
      primary: recognized[0],
      secondary: recognized[1]
    } : null;
  };
  attrValueValidators = {
    [1 /* TargetFolder */]: this.validateTargetFolderAttrValue.bind(this),
    [2 /* OrderAsc */]: this.validateOrderAttrValue.bind(this),
    [3 /* OrderDesc */]: this.validateOrderAttrValue.bind(this),
    [4 /* OrderUnspecified */]: this.validateOrderAttrValue.bind(this)
  };
  convertPlainStringSortingGroupSpecToArraySpec = (spec) => {
    spec = spec.trim();
    if (isThreeDots(spec)) {
      return [ThreeDots];
    }
    if (spec.startsWith(ThreeDots)) {
      return [ThreeDots, spec.substring(ThreeDotsLength)];
    }
    if (spec.endsWith(ThreeDots)) {
      if (spec.endsWith(AmbigueFourDotsEscaper)) {
        return [spec.substring(0, spec.length - AmbigueFourDotsEscaperLength + AmbigueFourDotsEscaperOverlap), ThreeDots];
      } else {
        return [spec.substring(0, spec.length - ThreeDotsLength), ThreeDots];
      }
    }
    const idx = spec.indexOf(ThreeDots);
    const idxOfAmbigueFourDotsEscaper = spec.indexOf(AmbigueFourDotsEscaper);
    if (idx > 0) {
      if (idxOfAmbigueFourDotsEscaper >= 0 && idxOfAmbigueFourDotsEscaper === idx - (AmbigueFourDotsEscaperLength - ThreeDotsLength)) {
        return [
          spec.substring(0, idxOfAmbigueFourDotsEscaper + AmbigueFourDotsEscaperOverlap),
          ThreeDots,
          spec.substring(idx + ThreeDotsLength)
        ];
      } else {
        return [
          spec.substring(0, idx),
          ThreeDots,
          spec.substring(idx + ThreeDotsLength)
        ];
      }
    }
    return [spec];
  };
  putNewSpecForNewTargetFolder(folderPath) {
    const newSpec = {
      targetFoldersPaths: [folderPath ?? this.ctx.folderPath],
      groups: [],
      implicit: this.ctx.implicitSpec
    };
    this.ctx.specs.push(newSpec);
    this.ctx.currentSpec = void 0;
    this.ctx.currentSpecGroup = void 0;
    return newSpec;
  }
  // Detection of slippery syntax errors which can confuse user due to false positive parsing with an unexpected sorting result
  consumeParsedItemToHide(spec) {
    if (spec.arraySpec?.length === 1) {
      const theOnly = spec.arraySpec[0];
      if (!isThreeDots(theOnly)) {
        const nameWithExt = theOnly.trim();
        if (nameWithExt) {
          if (!detectSortingSymbols(nameWithExt)) {
            if (this.ctx.currentSpec) {
              const itemsToHide = this.ctx.currentSpec?.itemsToHide ?? /* @__PURE__ */ new Set();
              itemsToHide.add(nameWithExt);
              this.ctx.currentSpec.itemsToHide = itemsToHide;
              return true;
            }
          }
        }
      }
    }
    return false;
  }
  consumeParsedSortingGroupSpec = (spec) => {
    if (spec.outsidersGroup) {
      return {
        type: 0 /* Outsiders */,
        filesOnly: spec.filesOnly,
        foldersOnly: spec.foldersOnly,
        matchFilenameWithExt: spec.matchFilenameWithExt
        // Doesn't make sense for matching, yet for multi-match
      };
    }
    if (spec.arraySpec?.length === 1) {
      const theOnly = spec.arraySpec[0];
      if (isThreeDots(theOnly)) {
        return {
          type: 1 /* MatchAll */,
          filesOnly: spec.filesOnly,
          foldersOnly: spec.foldersOnly,
          matchFilenameWithExt: spec.matchFilenameWithExt
          // Doesn't make sense for matching, yet for multi-match
        };
      } else {
        if (theOnly.startsWith(MetadataFieldIndicatorLexeme)) {
          const metadataFieldName = extractIdentifier(
            theOnly.substring(MetadataFieldIndicatorLexeme.length),
            DEFAULT_METADATA_FIELD_FOR_SORTING
          );
          return {
            type: 6 /* HasMetadataField */,
            withMetadataFieldName: metadataFieldName,
            filesOnly: spec.filesOnly,
            foldersOnly: spec.foldersOnly,
            matchFilenameWithExt: spec.matchFilenameWithExt
          };
        } else if (theOnly.startsWith(BookmarkedItemIndicatorLexeme)) {
          return {
            type: 7 /* BookmarkedOnly */,
            filesOnly: spec.filesOnly,
            foldersOnly: spec.foldersOnly,
            matchFilenameWithExt: spec.matchFilenameWithExt
          };
        } else if (theOnly.startsWith(IconIndicatorLexeme)) {
          const iconName2 = extractIdentifier(theOnly.substring(IconIndicatorLexeme.length));
          return {
            type: 8 /* HasIcon */,
            iconName: iconName2,
            filesOnly: spec.filesOnly,
            foldersOnly: spec.foldersOnly,
            matchFilenameWithExt: spec.matchFilenameWithExt
          };
        } else {
          return {
            type: 2 /* ExactName */,
            exactText: theOnly,
            filesOnly: spec.filesOnly,
            foldersOnly: spec.foldersOnly,
            matchFilenameWithExt: spec.matchFilenameWithExt
          };
        }
      }
    }
    if (spec.arraySpec?.length === 2) {
      const theFirst = spec.arraySpec[0];
      const theSecond = spec.arraySpec[1];
      if (isThreeDots(theFirst) && !isThreeDots(theSecond) && !containsThreeDots(theSecond)) {
        return {
          type: 4 /* ExactSuffix */,
          exactSuffix: theSecond,
          filesOnly: spec.filesOnly,
          foldersOnly: spec.foldersOnly,
          matchFilenameWithExt: spec.matchFilenameWithExt
        };
      } else if (!isThreeDots(theFirst) && isThreeDots(theSecond) && !containsThreeDots(theFirst)) {
        return {
          type: 3 /* ExactPrefix */,
          exactPrefix: theFirst,
          filesOnly: spec.filesOnly,
          foldersOnly: spec.foldersOnly,
          matchFilenameWithExt: spec.matchFilenameWithExt
        };
      } else {
        this.problem(1 /* SyntaxErrorInGroupSpec */, "three dots occurring more than once and no more text specified");
        return null;
      }
    }
    if (spec.arraySpec?.length === 3) {
      const theFirst = spec.arraySpec[0];
      const theMiddle = spec.arraySpec[1];
      const theLast = spec.arraySpec[2];
      if (isThreeDots(theMiddle) && !isThreeDots(theFirst) && !isThreeDots(theLast) && !containsThreeDots(theLast)) {
        return {
          type: 5 /* ExactHeadAndTail */,
          exactPrefix: theFirst,
          exactSuffix: theLast,
          filesOnly: spec.filesOnly,
          foldersOnly: spec.foldersOnly,
          matchFilenameWithExt: spec.matchFilenameWithExt
        };
      } else {
        this.problem(1 /* SyntaxErrorInGroupSpec */, "three dots occurring more than once or unrecognized specification of sorting rule");
        return null;
      }
    }
    this.problem(1 /* SyntaxErrorInGroupSpec */, "Unrecognized specification of sorting rule");
    return null;
  };
  // Returns true if no regex will be involved (hence no adjustment) or if correctly adjusted with regex
  adjustSortingGroupForRegexBasedMatchers = (group) => {
    return this.adjustSortingGroupForSortingSymbol(group);
  };
  // Returns true if no sorting symbol (hence no adjustment) or if correctly adjusted with regex
  adjustSortingGroupForSortingSymbol = (group) => {
    switch (group.type) {
      case 3 /* ExactPrefix */:
        const regexInPrefix = convertPlainStringToLeftRegex(group.exactPrefix);
        if (regexInPrefix) {
          if (regexInPrefix.containsAdvancedRegex && checkAdjacency(regexInPrefix).noSuffix) {
            this.problem(10 /* SortingSymbolAdjacentToWildcard */, ADJACENCY_ERROR);
            return false;
          }
          delete group.exactPrefix;
          group.regexPrefix = regexInPrefix.regexpSpec;
        }
        break;
      case 4 /* ExactSuffix */:
        const regexInSuffix = convertPlainStringToRightRegex(group.exactSuffix);
        if (regexInSuffix) {
          if (regexInSuffix.containsAdvancedRegex && checkAdjacency(regexInSuffix).noPrefix) {
            this.problem(10 /* SortingSymbolAdjacentToWildcard */, ADJACENCY_ERROR);
            return false;
          }
          delete group.exactSuffix;
          group.regexSuffix = regexInSuffix.regexpSpec;
        }
        break;
      case 5 /* ExactHeadAndTail */:
        const regexInHead = convertPlainStringToLeftRegex(group.exactPrefix);
        if (regexInHead) {
          if (regexInHead.containsAdvancedRegex && checkAdjacency(regexInHead).noSuffix) {
            this.problem(10 /* SortingSymbolAdjacentToWildcard */, ADJACENCY_ERROR);
            return false;
          }
          delete group.exactPrefix;
          group.regexPrefix = regexInHead.regexpSpec;
        }
        const regexInTail = convertPlainStringToRightRegex(group.exactSuffix);
        if (regexInTail) {
          if (regexInTail.containsAdvancedRegex && checkAdjacency(regexInTail).noPrefix) {
            this.problem(10 /* SortingSymbolAdjacentToWildcard */, ADJACENCY_ERROR);
            return false;
          }
          delete group.exactSuffix;
          group.regexSuffix = regexInTail.regexpSpec;
        }
        break;
      case 2 /* ExactName */:
        const regexInExactMatch = convertPlainStringToFullMatchRegex(group.exactText);
        if (regexInExactMatch) {
          delete group.exactText;
          group.regexPrefix = regexInExactMatch.regexpSpec;
        }
        break;
    }
    return true;
  };
  addExpediteGroupInfo = (spec, groupPriority, groupIdx) => {
    if (!spec.priorityOrder) {
      spec.priorityOrder = [];
    }
    let inserted = false;
    for (let idx = 0; idx < spec.priorityOrder.length; idx++) {
      if (groupPriority > spec.groups[spec.priorityOrder[idx]].priority) {
        spec.priorityOrder.splice(idx, 0, groupIdx);
        inserted = true;
        break;
      }
    }
    if (!inserted) {
      spec.priorityOrder.push(groupIdx);
    }
  };
};

// src/model.ts
function isRecord(value) {
  try {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  } catch {
    return false;
  }
}
function ownValue(value, key) {
  if (!isRecord(value)) return void 0;
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor && "value" in descriptor ? descriptor.value : void 0;
  } catch {
    return void 0;
  }
}
function ownString(value, key) {
  const item = ownValue(value, key);
  return typeof item === "string" && item.length > 0 ? item : void 0;
}
function normalizeSlashes(value) {
  return value.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/{2,}/g, "/");
}
function normalizeCanonicalPath(value) {
  if (typeof value !== "string") return void 0;
  let normalized = normalizeSlashes(value).replace(/^\/+|\/+$/g, "");
  if (normalized.length === 0) return void 0;
  normalized = normalized.replace(/\.(?:md|markdown|canvas|base)$/i, "");
  return normalized;
}
function normalizeFolderPath(value) {
  const normalized = normalizeCanonicalPath(value);
  if (!normalized || normalized === "index") return "/";
  return normalized.endsWith("/index") ? normalized.slice(0, -"/index".length) || "/" : normalized;
}
function sourcePathOf(value, slug) {
  const raw = ownString(value, "relativePath") ?? ownString(value, "filePath") ?? `${slug}.md`;
  return normalizeSlashes(raw).replace(/^\/+/, "");
}
function fileNameOf(sourcePath) {
  return sourcePath.split("/").at(-1) ?? sourcePath;
}
function basenameOf(fileName) {
  return fileName.replace(/\.(?:md|markdown|canvas|base)$/i, "");
}
function toTimestamp(value) {
  try {
    if (value instanceof Date) {
      const timestamp = Date.prototype.getTime.call(value);
      return Number.isFinite(timestamp) ? timestamp : void 0;
    }
  } catch {
    return void 0;
  }
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? timestamp : void 0;
  }
  return void 0;
}
function firstTimestamp(...values) {
  for (const value of values) {
    const timestamp = toTimestamp(value);
    if (timestamp !== void 0) return timestamp;
  }
  return 0;
}
function toFileRecord(value) {
  const slug = normalizeCanonicalPath(ownValue(value, "slug"));
  if (!slug) return void 0;
  const sourcePath = sourcePathOf(value, slug);
  const fileName = fileNameOf(sourcePath);
  const frontmatterValue = ownValue(value, "frontmatter");
  const frontmatter = isRecord(frontmatterValue) ? frontmatterValue : {};
  const datesValue = ownValue(value, "dates");
  const dates = isRecord(datesValue) ? datesValue : {};
  return {
    slug,
    sourcePath,
    fileName,
    basename: basenameOf(fileName),
    frontmatter,
    created: firstTimestamp(
      ownValue(dates, "created"),
      ownValue(value, "created"),
      ownValue(frontmatter, "created"),
      ownValue(frontmatter, "date")
    ),
    modified: firstTimestamp(
      ownValue(dates, "modified"),
      ownValue(value, "modified"),
      ownValue(value, "updated"),
      ownValue(frontmatter, "modified"),
      ownValue(frontmatter, "updated"),
      ownValue(frontmatter, "date")
    )
  };
}
function sourceDirectoryParts(file) {
  const parts = file.sourcePath.split("/").filter(Boolean);
  parts.pop();
  return parts;
}
function canonicalDirectoryParts(file) {
  const parts = file.slug.split("/").filter(Boolean);
  if (parts.at(-1) === "index") parts.pop();
  else parts.pop();
  return parts;
}
function ensureFolder(folders, canonicalParts, sourceParts, depth) {
  const canonicalPath = canonicalParts.slice(0, depth).join("/") || "/";
  const existing = folders.get(canonicalPath);
  if (existing) return existing;
  const sourceSlice = sourceParts.slice(0, depth);
  const sourcePath = sourceSlice.join("/") || "/";
  const fallbackName = canonicalParts[depth - 1] ?? "";
  const folder = {
    canonicalPath,
    sourcePath,
    name: sourceSlice.at(-1) ?? fallbackName,
    directFiles: [],
    descendantFiles: []
  };
  folders.set(canonicalPath, folder);
  return folder;
}
function safeArray(value) {
  try {
    return Array.isArray(value) ? Array.from(value) : [];
  } catch {
    return [];
  }
}
function buildVaultModel(values, options) {
  const files = /* @__PURE__ */ new Map();
  const folders = /* @__PURE__ */ new Map();
  folders.set("/", {
    canonicalPath: "/",
    sourcePath: "/",
    name: "",
    directFiles: [],
    descendantFiles: []
  });
  for (const value of safeArray(values)) {
    const file = toFileRecord(value);
    if (!file || files.has(file.slug)) continue;
    files.set(file.slug, file);
    const canonicalParts = canonicalDirectoryParts(file);
    const sourceParts = sourceDirectoryParts(file);
    for (let depth = 1; depth <= canonicalParts.length; depth += 1) {
      ensureFolder(folders, canonicalParts, sourceParts, depth);
    }
  }
  for (const file of files.values()) {
    const canonicalParts = canonicalDirectoryParts(file);
    const parentPath2 = canonicalParts.join("/") || "/";
    const parent = folders.get(parentPath2);
    if (!parent) continue;
    const isIndex = file.slug === "index" || file.slug.endsWith("/index");
    if (isIndex) parent.index ??= file;
    if (file.basename === parent.name) parent.folderNote ??= file;
    parent.directFiles.push(file);
    parent.descendantFiles.push(file);
    for (let depth = canonicalParts.length - 1; depth >= 0; depth -= 1) {
      const ancestorPath = canonicalParts.slice(0, depth).join("/") || "/";
      folders.get(ancestorPath)?.descendantFiles.push(file);
    }
  }
  const specSources = [];
  for (const file of files.values()) {
    const rawSpec = ownValue(file.frontmatter, options.specProperty);
    if (rawSpec === void 0 || rawSpec === null) continue;
    if (typeof rawSpec !== "string") {
      throw new Error(
        `${file.sourcePath}: frontmatter property "${options.specProperty}" must be a string`
      );
    }
    const canonicalParts = canonicalDirectoryParts(file);
    const folder = folders.get(canonicalParts.join("/") || "/");
    specSources.push({
      folderPath: folder?.sourcePath ?? "/",
      fileName: file.fileName,
      text: rawSpec
    });
  }
  specSources.sort(
    (left, right) => left.folderPath.localeCompare(right.folderPath) || left.fileName.localeCompare(right.fileName)
  );
  return { files, folders, specSources };
}
function metadataForFolder(folder) {
  if (!folder) return {};
  return {
    ...folder.folderNote?.frontmatter ?? {},
    ...folder.index?.frontmatter ?? {}
  };
}
function sourceFolderPath(model, canonicalPath) {
  return model.folders.get(normalizeFolderPath(canonicalPath))?.sourcePath ?? normalizeFolderPath(canonicalPath);
}
function sourceFolderName(model, canonicalPath) {
  const normalized = normalizeFolderPath(canonicalPath);
  return model.folders.get(normalized)?.name ?? (normalized === "/" ? "" : normalized.split("/").at(-1) ?? "");
}

// src/engine.ts
var naturalCompare = new Intl.Collator(void 0, {
  usage: "sort",
  sensitivity: "base",
  numeric: true
}).compare;
var trueAlphabeticalCompare = new Intl.Collator(void 0, {
  usage: "sort",
  sensitivity: "base",
  numeric: false
}).compare;
var vscNaturalCompare = new Intl.Collator("en", {
  usage: "sort",
  sensitivity: "base",
  numeric: true
}).compare;
var defaultOptions = Object.freeze({
  specProperty: "sorting-spec",
  bookmarksOrderProperty: "bookmarks-order",
  iconProperty: "icon"
});
function normalizeOptions(value) {
  const normalizeKey = (key) => {
    const candidate = ownValue(value, key);
    return typeof candidate === "string" && candidate.trim().length > 0 ? candidate.trim() : defaultOptions[key];
  };
  return {
    specProperty: normalizeKey("specProperty"),
    bookmarksOrderProperty: normalizeKey("bookmarksOrderProperty"),
    iconProperty: normalizeKey("iconProperty")
  };
}
function compileSpecs(model) {
  if (model.specSources.length === 0) return void 0;
  const errors = [];
  const processor = new SortingSpecProcessor((...parts) => {
    errors.push(parts.map(String).join(" "));
  });
  let collection;
  for (const source of model.specSources) {
    collection = processor.parseSortSpecFromText(
      source.text.split(/\r?\n/),
      source.folderPath,
      source.fileName,
      collection
    );
    if (!collection) {
      const detail = processor.recentErrorMessage ?? errors.at(-1) ?? "Unknown parser error";
      throw new Error(`Invalid Custom File Explorer sorting specification.
${detail}`);
    }
  }
  return collection ?? void 0;
}
function resolveSpec(collection, model, canonicalFolderPath) {
  if (!collection) return void 0;
  const folderPath = sourceFolderPath(model, canonicalFolderPath);
  const folderName = sourceFolderName(model, canonicalFolderPath);
  return collection.sortSpecByPath?.[folderPath] ?? collection.sortSpecByName?.[folderName] ?? collection.sortSpecByWildcard?.folderMatch(folderPath, folderName) ?? void 0;
}
function stringValue(value) {
  if (value === void 0 || value === null) return void 0;
  try {
    return String(value);
  } catch {
    return void 0;
  }
}
function metadataValue(metadata, field, extractor) {
  const value = stringValue(ownValue(metadata, field));
  if (value === void 0) return void 0;
  return extractor ? extractor(value) ?? void 0 : value;
}
function bookmarkOrder(metadata, options) {
  const raw = ownValue(metadata, options.bookmarksOrderProperty);
  const numeric = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
  return Number.isFinite(numeric) && numeric > 0 ? numeric : void 0;
}
function iconName(metadata, options) {
  const direct = ownValue(metadata, options.iconProperty);
  if (typeof direct === "string" && direct.length > 0) return direct;
  const panel = ownValue(metadata, "panel");
  const panelIcon = ownValue(panel, options.iconProperty);
  return typeof panelIcon === "string" && panelIcon.length > 0 ? panelIcon : void 0;
}
function regexMatch(expression, value) {
  expression.regex.lastIndex = 0;
  const match = expression.regex.exec(value);
  if (!match) return [false];
  const captured = match[1];
  const normalized = captured ? expression.normalizerFn ? expression.normalizerFn(captured) ?? void 0 : captured : void 0;
  return [true, normalized, match[0]];
}
function expandMacro(value, folderName) {
  return folderName ? value?.replace("{:%parent-folder-name%:}", folderName) : value;
}
function folderGroups(spec, folderName) {
  return spec.groups.map((group) => ({
    ...group,
    exactText: expandMacro(group.exactText, folderName),
    exactPrefix: expandMacro(group.exactPrefix, folderName),
    exactSuffix: expandMacro(group.exactSuffix, folderName)
  }));
}
function isMetadataSort(order) {
  return order === 21 /* byMetadataFieldAlphabetical */ || order === 22 /* byMetadataFieldTrueAlphabetical */ || order === 23 /* byMetadataFieldAlphabeticalReverse */ || order === 24 /* byMetadataFieldTrueAlphabeticalReverse */;
}
function selectedMetadata(item, level) {
  if (level === 1 /* Secondary */) return item.secondaryMetadata;
  if (level === 2 /* DerivedPrimary */) return item.derivedPrimaryMetadata;
  if (level === 3 /* DerivedSecondary */) return item.derivedSecondaryMetadata;
  return item.primaryMetadata;
}
function metadataComparator(reverse, trueAlphabetical, level) {
  const compare = trueAlphabetical ? trueAlphabeticalCompare : naturalCompare;
  return (initialLeft, initialRight) => {
    const left = reverse ? initialRight : initialLeft;
    const right = reverse ? initialLeft : initialRight;
    const leftValue = selectedMetadata(left, level);
    const rightValue = selectedMetadata(right, level);
    if (leftValue !== void 0 && rightValue !== void 0) return compare(leftValue, rightValue);
    if (leftValue !== void 0) return reverse ? 1 : -1;
    if (rightValue !== void 0) return reverse ? -1 : 1;
    return 0;
  };
}
function datedComparator(field, reverse) {
  return (initialLeft, initialRight) => {
    const left = reverse ? initialRight : initialLeft;
    const right = reverse ? initialLeft : initialRight;
    const leftValue = left[field];
    const rightValue = right[field];
    if (leftValue && rightValue) return leftValue - rightValue;
    if (leftValue) return reverse ? 1 : -1;
    if (rightValue) return reverse ? -1 : 1;
    return 0;
  };
}
function standardComparator(left, right) {
  if (left.isFolder !== right.isFolder) return left.isFolder ? -1 : 1;
  return naturalCompare(left.sortString, right.sortString);
}
function comparatorFor(order, level) {
  switch (order) {
    case 1 /* alphabetical */:
      return (left, right) => naturalCompare(left.sortString, right.sortString);
    case 30 /* alphabeticalWithFilesPreferred */:
    case 31 /* alphabeticalWithFoldersPreferred */:
      return (left, right) => naturalCompare(left.sortString, right.sortString) || (left.isFolder === right.isFolder ? 0 : left.isFolder ? 1 : -1);
    case 2 /* alphabeticalWithFileExt */:
      return (left, right) => naturalCompare(left.sortStringWithExtension, right.sortStringWithExtension);
    case 3 /* trueAlphabetical */:
      return (left, right) => trueAlphabeticalCompare(left.sortString, right.sortString);
    case 4 /* trueAlphabeticalWithFileExt */:
      return (left, right) => trueAlphabeticalCompare(left.sortStringWithExtension, right.sortStringWithExtension);
    case 5 /* alphabeticalReverse */:
      return (left, right) => naturalCompare(right.sortString, left.sortString);
    case 6 /* alphabeticalReverseWithFileExt */:
      return (left, right) => naturalCompare(right.sortStringWithExtension, left.sortStringWithExtension);
    case 7 /* trueAlphabeticalReverse */:
      return (left, right) => trueAlphabeticalCompare(right.sortString, left.sortString);
    case 8 /* trueAlphabeticalReverseWithFileExt */:
      return (left, right) => trueAlphabeticalCompare(right.sortStringWithExtension, left.sortStringWithExtension);
    case 9 /* byModifiedTime */:
      return (left, right) => left.isFolder && right.isFolder ? naturalCompare(left.sortString, right.sortString) : left.modified - right.modified;
    case 12 /* byModifiedTimeReverse */:
      return (left, right) => left.isFolder && right.isFolder ? naturalCompare(left.sortString, right.sortString) : right.modified - left.modified;
    case 15 /* byCreatedTime */:
      return (left, right) => left.isFolder && right.isFolder ? naturalCompare(left.sortString, right.sortString) : left.created - right.created;
    case 18 /* byCreatedTimeReverse */:
      return (left, right) => left.isFolder && right.isFolder ? naturalCompare(left.sortString, right.sortString) : right.created - left.created;
    case 10 /* byModifiedTimeAdvanced */:
    case 11 /* byModifiedTimeAdvancedRecursive */:
      return datedComparator("modified", false);
    case 13 /* byModifiedTimeReverseAdvanced */:
    case 14 /* byModifiedTimeReverseAdvancedRecursive */:
      return datedComparator("modified", true);
    case 16 /* byCreatedTimeAdvanced */:
    case 17 /* byCreatedTimeAdvancedRecursive */:
      return datedComparator("created", false);
    case 19 /* byCreatedTimeReverseAdvanced */:
    case 20 /* byCreatedTimeReverseAdvancedRecursive */:
      return datedComparator("created", true);
    case 21 /* byMetadataFieldAlphabetical */:
      return metadataComparator(false, false, level);
    case 22 /* byMetadataFieldTrueAlphabetical */:
      return metadataComparator(false, true, level);
    case 23 /* byMetadataFieldAlphabeticalReverse */:
      return metadataComparator(true, false, level);
    case 24 /* byMetadataFieldTrueAlphabeticalReverse */:
      return metadataComparator(true, true, level);
    case 26 /* byBookmarkOrder */:
      return (left, right) => left.bookmarkOrder !== void 0 && right.bookmarkOrder !== void 0 ? left.bookmarkOrder - right.bookmarkOrder : left.bookmarkOrder !== void 0 ? -1 : right.bookmarkOrder !== void 0 ? 1 : 0;
    case 27 /* byBookmarkOrderReverse */:
      return (left, right) => left.bookmarkOrder !== void 0 && right.bookmarkOrder !== void 0 ? right.bookmarkOrder - left.bookmarkOrder : left.bookmarkOrder !== void 0 ? 1 : right.bookmarkOrder !== void 0 ? -1 : 0;
    case 28 /* fileFirst */:
      return (left, right) => left.isFolder === right.isFolder ? 0 : left.isFolder ? 1 : -1;
    case 29 /* folderFirst */:
      return (left, right) => left.isFolder === right.isFolder ? 0 : left.isFolder ? -1 : 1;
    case 32 /* vscUnicode */:
      return (left, right) => left.sortString === right.sortString ? 0 : left.sortString < right.sortString ? -1 : 1;
    case 33 /* vscUnicodeReverse */:
      return (left, right) => left.sortString === right.sortString ? 0 : right.sortString < left.sortString ? -1 : 1;
    case 34 /* vscUnicodeNatural */:
      return (left, right) => vscNaturalCompare(left.sortStringWithExtension, right.sortStringWithExtension);
    case 35 /* vscUnicodeNaturalReverse */:
      return (left, right) => vscNaturalCompare(right.sortStringWithExtension, left.sortStringWithExtension);
    case 25 /* standardObsidian */:
      return standardComparator;
    default:
      return (left, right) => naturalCompare(left.sortString, right.sortString) || (left.isFolder === right.isFolder ? 0 : left.isFolder ? 1 : -1);
  }
}
function isRecursiveDateOrder(order) {
  return order === 11 /* byModifiedTimeAdvancedRecursive */ || order === 14 /* byModifiedTimeReverseAdvancedRecursive */ || order === 17 /* byCreatedTimeAdvancedRecursive */ || order === 20 /* byCreatedTimeReverseAdvancedRecursive */;
}
function isAdvancedDateOrder(order) {
  return isRecursiveDateOrder(order) || order === 10 /* byModifiedTimeAdvanced */ || order === 13 /* byModifiedTimeReverseAdvanced */ || order === 16 /* byCreatedTimeAdvanced */ || order === 19 /* byCreatedTimeReverseAdvanced */;
}
function folderDates(files) {
  let created = 0;
  let modified = 0;
  for (const file of files) {
    if (file.created && (!created || file.created < created)) created = file.created;
    if (file.modified > modified) modified = file.modified;
  }
  return { created, modified };
}
function sortingMetadata(sorting, fallbackField, metadata) {
  if (!sorting || !isMetadataSort(sorting.order)) return void 0;
  return metadataValue(
    metadata,
    sorting.byMetadata ?? fallbackField ?? DEFAULT_METADATA_FIELD_FOR_SORTING,
    sorting.metadataValueExtractor
  );
}
function matchesGroup(item, group, options) {
  if (group.foldersOnly && !item.isFolder) return { matched: false };
  if (group.filesOnly && item.isFolder) return { matched: false };
  const value = group.matchFilenameWithExt ? item.nameWithExtension : item.name;
  switch (group.type) {
    case 3 /* ExactPrefix */:
      if (group.exactPrefix !== void 0) return { matched: value.startsWith(group.exactPrefix) };
      if (group.regexPrefix) {
        const [matched, derived] = regexMatch(group.regexPrefix, value);
        return { matched, derived };
      }
      return { matched: false };
    case 4 /* ExactSuffix */:
      if (group.exactSuffix !== void 0) return { matched: value.endsWith(group.exactSuffix) };
      if (group.regexSuffix) {
        const [matched, derived] = regexMatch(group.regexSuffix, value);
        return { matched, derived };
      }
      return { matched: false };
    case 5 /* ExactHeadAndTail */: {
      if (group.exactPrefix !== void 0 && group.exactSuffix !== void 0) {
        return {
          matched: value.length >= group.exactPrefix.length + group.exactSuffix.length && value.startsWith(group.exactPrefix) && value.endsWith(group.exactSuffix)
        };
      }
      const [leftMatch, leftDerived, leftFull] = group.regexPrefix ? regexMatch(group.regexPrefix, value) : [value.startsWith(group.exactPrefix ?? ""), void 0, group.exactPrefix];
      const [rightMatch, rightDerived, rightFull] = group.regexSuffix ? regexMatch(group.regexSuffix, value) : [value.endsWith(group.exactSuffix ?? ""), void 0, group.exactSuffix];
      const matched = leftMatch && rightMatch && (leftFull?.length ?? 0) + (rightFull?.length ?? 0) <= value.length;
      return {
        matched,
        derived: matched ? `${leftDerived ?? ""}${rightDerived ?? ""}` || void 0 : void 0
      };
    }
    case 2 /* ExactName */:
      if (group.exactText !== void 0) return { matched: value === group.exactText };
      if (group.regexPrefix) {
        const [matched, derived] = regexMatch(group.regexPrefix, value);
        return { matched, derived };
      }
      return { matched: false };
    case 6 /* HasMetadataField */:
      return {
        matched: group.withMetadataFieldName !== void 0 && Object.prototype.hasOwnProperty.call(item.metadata, group.withMetadataFieldName)
      };
    case 7 /* BookmarkedOnly */:
      return { matched: bookmarkOrder(item.metadata, options) !== void 0 };
    case 8 /* HasIcon */: {
      const icon = iconName(item.metadata, options);
      return { matched: icon !== void 0 && (!group.iconName || icon === group.iconName) };
    }
    case 1 /* MatchAll */:
      return { matched: true };
    case 0 /* Outsiders */:
      return { matched: false };
  }
}
function applyGroup(item, spec, groups, options) {
  const indexes = spec.priorityOrder ?? groups.map((_, index) => index);
  let groupIndex;
  let derived;
  for (const index of indexes) {
    const group2 = groups[index];
    if (!group2 || group2.type === 0 /* Outsiders */) continue;
    const result = matchesGroup(item, group2, options);
    if (!result.matched) continue;
    groupIndex = group2.combineWithIdx ?? index;
    derived = result.derived;
    break;
  }
  if (groupIndex === void 0) {
    groupIndex = item.isFolder ? spec.outsidersFoldersGroupIdx ?? spec.outsidersGroupIdx : spec.outsidersFilesGroupIdx ?? spec.outsidersGroupIdx;
  }
  groupIndex ??= groups.length;
  item.groupIndex = groupIndex;
  if (derived) {
    item.sortString = `${derived}//${item.name}`;
    item.sortStringWithExtension = `${derived}//${item.nameWithExtension}`;
  }
  const group = groups[groupIndex];
  item.bookmarkOrder = bookmarkOrder(item.metadata, options);
  item.primaryMetadata = sortingMetadata(
    group?.sorting,
    group?.withMetadataFieldName,
    item.metadata
  );
  item.secondaryMetadata = sortingMetadata(
    group?.secondarySorting,
    group?.withMetadataFieldName,
    item.metadata
  );
  item.derivedPrimaryMetadata = sortingMetadata(spec.defaultSorting, void 0, item.metadata);
  item.derivedSecondaryMetadata = sortingMetadata(
    spec.defaultSecondarySorting,
    void 0,
    item.metadata
  );
  if (item.isFolder) {
    const orders = [
      group?.sorting?.order,
      group?.secondarySorting?.order,
      spec.defaultSorting?.order,
      spec.defaultSecondarySorting?.order
    ];
    if (orders.some(isAdvancedDateOrder)) {
      const dates = folderDates(
        orders.some(isRecursiveDateOrder) ? item.descendants : item.children
      );
      item.created = dates.created;
      item.modified = dates.modified;
    }
  }
}
function compareItems(left, right, spec, groups) {
  if (left.groupIndex !== right.groupIndex) return (left.groupIndex ?? 0) - (right.groupIndex ?? 0);
  const group = groups[left.groupIndex ?? -1];
  const stages = [
    [group?.sorting, 0 /* Primary */],
    [group?.secondarySorting, 1 /* Secondary */],
    [spec.defaultSorting, 2 /* DerivedPrimary */],
    [spec.defaultSecondarySorting, 3 /* DerivedSecondary */]
  ];
  for (const [sorting, level] of stages) {
    if (!sorting) continue;
    const result = comparatorFor(sorting.order, level)(left, right);
    if (result !== 0) return result;
  }
  return comparatorFor(30 /* default */, 0 /* Primary */)(left, right) || left.originalIndex - right.originalIndex;
}
function fileForPath(model, path2) {
  return model.files.get(path2) ?? model.files.get(`${path2}/index`);
}
function toSortable(input, index, model) {
  const normalizedPath = normalizeFolderPath(input.path);
  const folder = input.isFolder ? model.folders.get(normalizedPath) : void 0;
  const file = input.isFolder ? folder?.index ?? folder?.folderNote : fileForPath(model, input.path);
  const fallbackName = normalizedPath === "/" ? "" : normalizedPath.split("/").filter(Boolean).at(-1) ?? "";
  const name = input.isFolder ? folder?.name ?? fallbackName : file?.basename ?? fallbackName;
  const metadata = input.isFolder ? metadataForFolder(folder) : file?.frontmatter ?? {};
  return {
    value: input.value,
    path: input.path,
    name,
    nameWithExtension: input.isFolder ? name : file?.fileName ?? name,
    isFolder: input.isFolder,
    metadata,
    children: folder?.directFiles ?? [],
    descendants: folder?.descendantFiles ?? [],
    created: input.isFolder ? 0 : file?.created ?? 0,
    modified: input.isFolder ? 0 : file?.modified ?? 0,
    sortString: name,
    sortStringWithExtension: input.isFolder ? name : file?.fileName ?? name,
    originalIndex: index
  };
}
function compileModel(allFiles, options) {
  const model = buildVaultModel(allFiles, options);
  return { model, collection: compileSpecs(model) };
}
function sortWithCompiledModel(compiled, folderPath, inputs, options) {
  const spec = resolveSpec(compiled.collection, compiled.model, folderPath);
  if (!spec) return { matched: false, items: inputs.map((input) => input.value) };
  const groups = folderGroups(spec, sourceFolderName(compiled.model, folderPath));
  const hidden = spec.itemsToHide;
  const sortable = inputs.map((input, index) => toSortable(input, index, compiled.model)).filter((item) => !hidden?.has(item.nameWithExtension));
  for (const item of sortable) applyGroup(item, spec, groups, options);
  sortable.sort((left, right) => compareItems(left, right, spec, groups));
  return { matched: true, items: sortable.map((item) => item.value) };
}
function createSortingService(userOptions = void 0) {
  const options = normalizeOptions(userOptions);
  const cache = /* @__PURE__ */ new WeakMap();
  const getCompiled = (allFiles) => {
    if (typeof allFiles !== "object" || allFiles === null) return compileModel([], options);
    const cached = cache.get(allFiles);
    if (cached) return cached;
    const compiled = compileModel(allFiles, options);
    cache.set(allFiles, compiled);
    return compiled;
  };
  return Object.freeze({
    apiVersion: 1,
    sort(folderPath, items, allFiles) {
      return sortWithCompiledModel(getCompiled(allFiles), folderPath, items, options);
    }
  });
}
function parentPath(path2) {
  const parts = path2.split("/").filter(Boolean);
  parts.pop();
  return parts.join("/") || "/";
}
function buildExplorerOrderManifest(allFiles, userOptions = void 0) {
  const options = normalizeOptions(userOptions);
  const compiled = compileModel(allFiles, options);
  const children = /* @__PURE__ */ new Map();
  const add = (folderPath, entry) => {
    const list = children.get(folderPath) ?? [];
    list.push(entry);
    children.set(folderPath, list);
  };
  for (const folder of compiled.model.folders.values()) {
    if (folder.canonicalPath === "/") continue;
    add(parentPath(folder.canonicalPath), {
      key: `folder:${folder.canonicalPath}`,
      path: folder.canonicalPath,
      isFolder: true
    });
  }
  for (const file of compiled.model.files.values()) {
    if (file.slug === "index" || file.slug.endsWith("/index")) continue;
    add(parentPath(file.slug), {
      key: `file:${file.slug}`,
      path: file.slug,
      isFolder: false
    });
  }
  const folders = /* @__PURE__ */ Object.create(
    null
  );
  for (const [folderPath, entries] of children) {
    const result = sortWithCompiledModel(
      compiled,
      folderPath,
      entries.map((entry) => ({ value: entry, path: entry.path, isFolder: entry.isFolder })),
      options
    );
    if (!result.matched) continue;
    const visible = new Set(result.items.map((entry) => entry.key));
    folders[folderPath] = {
      order: result.items.map((entry) => entry.key),
      hidden: entries.filter((entry) => !visible.has(entry.key)).map((entry) => entry.key)
    };
  }
  return { version: 1, folders };
}
function validateSortingSpecifications(allFiles, userOptions = void 0) {
  compileModel(allFiles, normalizeOptions(userOptions));
}

// src/types.ts
var SORTING_SERVICE_SYMBOL = "@vinggit/custom-file-explorer-sorting-support/service/v1";
var EXPLORER_MANIFEST_PATH = "static/custom-file-explorer-sorting.json";

// src/scripts/explorer.inline.ts
var explorer_inline_default = 'function f(n){let e=String(n||"").replace(/\\\\/g,"/").replace(/^\\/+|\\/+$/g,"").replace(/\\.html$/i,"");return e==="index"?"/":(e.endsWith("/index")&&(e=e.slice(0,-6)),e||"/")}function E(n){let e=n.body?.dataset.basepath??n.documentElement.dataset.basepath,r=f(e||"");return r==="/"?"":r}function w(n,e){let t=`/${[E(n),"static/custom-file-explorer-sorting.json"].filter(Boolean).join("/")}`;return new URL(t,e).href}function m(n,e,r){try{let t=decodeURIComponent(new URL(n,e).pathname);return t=t.replace(/^\\/+|\\/+$/g,""),r&&(t===r||t.startsWith(`${r}/`))&&(t=t.slice(r.length).replace(/^\\/+/,"")),f(t)}catch{return}}function b(n){return new Set([...n.order,...n.hidden])}function x(n,e,r,t,o=!1){let i=m(n,e,r);if(!i)return;let s=b(t),d=`folder:${i}`,l=`file:${i}`;return s.has(d)?d:s.has(l)?l:o?d:l}function q(n,e){let r=new Map(e.order.map((t,o)=>[t,o]));return n.map((t,o)=>({item:t,index:o})).sort((t,o)=>{let i=t.item.key?r.get(t.item.key):void 0,s=o.item.key?r.get(o.item.key):void 0;return i!==void 0&&s!==void 0?i-s:i!==void 0?-1:s!==void 0?1:t.index-o.index}).map(({item:t})=>t)}function k(n,e){return Array.from(n.children).filter(r=>r.nodeType===1&&(!e||!r.classList.contains(e)))}function M(n,e,r){let t=new Set(r.hidden);for(let{value:i,key:s}of e){let d=!!s&&t.has(s);i.hidden!==d&&(i.hidden=d),d?i.dataset.cfesHidden="true":delete i.dataset.cfesHidden}let o=q(e,r);if(o.some(({value:i},s)=>i!==e[s]?.value))for(let{value:i}of o)n.appendChild(i)}function H(n,e,r,t){let o=n.querySelector(":scope > .folder-container[data-folderpath]");if(o){let s=f(o.dataset.folderpath);return{key:`folder:${s}`,folderPath:s}}let i=n.querySelector(":scope > a.nav-file-title");return{key:i?x(i.href,e,r,t,!1):void 0}}function R(n,e,r,t,o){let i=r.folders[f(e)],d=k(n,"overflow-end").map(l=>({value:l,...H(l,t,o,i??{order:[],hidden:[]})}));i&&M(n,d,i);for(let{value:l,folderPath:a}of d){if(!a)continue;let c=l.querySelector(":scope > .folder-outer > ul.content");c&&R(c,a,r,t,o)}}function I(n){let e=f(n);return e==="/"||!e.includes("/")?"/":e.slice(0,e.lastIndexOf("/"))}function U(n,e,r){let t=n.body?.dataset.slug??n.documentElement.dataset.slug;return t?f(t):m(e,e,r)??"/"}function $(n,e,r,t,o){let i=f(e),s=r.folders[i];if(!s)return;let l=k(n).filter(a=>a.classList.contains("section-li")).map(a=>{let c=a.querySelector(".section h3 a.internal");if(!c)return{value:a};let y=m(c.href,t,o);if(!y||I(y)!==i)return{value:a};let v=!1;try{v=decodeURIComponent(new URL(c.href,t).pathname).endsWith("/")}catch{}return{value:a,key:x(c.href,t,o,s,v)}});M(n,l,s)}function L(n,e,r){let t=E(n);for(let i of n.querySelectorAll("div.explorer")){let s=i.querySelector(".explorer-ul");s&&R(s,"/",e,r,t)}let o=U(n,r,t);for(let i of n.querySelectorAll(".page-listing ul.section-ul"))$(i,o,e,r,t)}var g,p,u;function D(){return w(document,window.location.origin)}async function O(n=!1){return n&&(p=void 0),p??(p=fetch(D(),{cache:"no-store"}).then(e=>{if(!e.ok)throw new Error(`HTTP ${e.status}`);return e.json()}).then(e=>{if(e?.version!==1||typeof e.folders!="object")throw new Error("unsupported manifest format");return g=e,e}).catch(e=>{console.error("[Custom File Explorer Sorting Support] Could not load order manifest",e)})),p}function P(){u=void 0,g&&L(document,g,window.location.href)}function S(){u===void 0&&(u=window.requestAnimationFrame(P))}async function h(n=!1){await O(n),S()}var T=new MutationObserver(n=>{n.some(e=>e.target instanceof Element?e.target.closest("div.explorer, .page-listing")||e.target.matches("div.explorer, .page-listing"):!1)&&S()});T.observe(document.documentElement,{childList:!0,subtree:!0});var F=()=>{h(!0)},A=()=>{h(!0)};document.addEventListener("nav",F);document.addEventListener("render",A);h();window.addCleanup?.(()=>{T.disconnect(),document.removeEventListener("nav",F),document.removeEventListener("render",A),u!==void 0&&window.cancelAnimationFrame(u)});\n';

// src/plugin.ts
function contentData(content) {
  return content.map(([, file]) => file.data);
}
async function emitManifest(ctx, content, options) {
  const manifest = buildExplorerOrderManifest(contentData(content), options);
  const outputPath = path.join(ctx.argv.output, ...EXPLORER_MANIFEST_PATH.split("/"));
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(manifest)}
`, "utf8");
  return [outputPath.replace(/\\/g, "/")];
}
function CustomFileExplorerSortingSupport(userOptions = void 0) {
  const options = normalizeOptions(userOptions);
  const service = createSortingService(options);
  globalThis[Symbol.for(SORTING_SERVICE_SYMBOL)] = service;
  return {
    name: "CustomFileExplorerSortingSupport",
    externalResources() {
      return {
        css: [],
        js: [
          {
            contentType: "inline",
            loadTime: "afterDOMReady",
            script: explorer_inline_default
          }
        ],
        additionalHead: []
      };
    },
    emit: (ctx, content) => emitManifest(ctx, content, options),
    partialEmit: (ctx, content) => emitManifest(ctx, content, options)
  };
}
var plugin_default = CustomFileExplorerSortingSupport;

export { CustomFileExplorerSortingSupport, EXPLORER_MANIFEST_PATH, SORTING_SERVICE_SYMBOL, buildExplorerOrderManifest, createSortingService, plugin_default as default, normalizeOptions, validateSortingSpecifications };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map