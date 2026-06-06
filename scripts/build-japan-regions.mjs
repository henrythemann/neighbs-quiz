import fs from 'node:fs';
import path from 'node:path';
import { bbox, featureCollection, rewind, union } from '@turf/turf';

const rootDir = path.resolve(import.meta.dirname, '..');
const prefecturesPath = path.join(rootDir, 'src', 'prefectures.geojson');
const outputPath = path.join(rootDir, 'src', 'japanRegionsGeojson.json');

const REGION_DEFINITIONS = [
  {
    id: 'hokkaido',
    name: '北海道地方',
    reading: 'ほっかいどうちほう',
    prefectures: ['北海道'],
  },
  {
    id: 'tohoku',
    name: '東北地方',
    reading: 'とうほくちほう',
    prefectures: ['青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県'],
  },
  {
    id: 'kanto',
    name: '関東地方',
    reading: 'かんとうちほう',
    prefectures: ['茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県'],
  },
  {
    id: 'chubu',
    name: '中部地方',
    reading: 'ちゅうぶちほう',
    prefectures: ['新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県'],
  },
  {
    id: 'kinki',
    name: '近畿地方',
    reading: 'きんきちほう',
    prefectures: ['三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県'],
  },
  {
    id: 'chugoku',
    name: '中国地方',
    reading: 'ちゅうごくちほう',
    prefectures: ['鳥取県', '島根県', '岡山県', '広島県', '山口県'],
  },
  {
    id: 'shikoku',
    name: '四国地方',
    reading: 'しこくちほう',
    prefectures: ['徳島県', '香川県', '愛媛県', '高知県'],
  },
  {
    id: 'kyushu-okinawa',
    name: '九州・沖縄地方',
    reading: 'きゅうしゅう・おきなわちほう',
    prefectures: ['福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'],
  },
];

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const cloneFeature = (feature) => JSON.parse(JSON.stringify(feature));

const getFeatureName = (feature) => feature?.properties?.name;

const getPrefectureFeaturesByName = (data) => {
  assert(data?.type === 'FeatureCollection', 'Expected prefectures.geojson to be a FeatureCollection.');
  assert(Array.isArray(data.features), 'Expected prefectures.geojson features to be an array.');

  const featuresByName = new Map();
  for (const feature of data.features) {
    const name = getFeatureName(feature);
    assert(typeof name === 'string' && name.length > 0, 'Every prefecture feature must have properties.name.');
    assert(!featuresByName.has(name), `Duplicate prefecture feature name: ${name}`);
    assert(
      feature.geometry?.type === 'Polygon' || feature.geometry?.type === 'MultiPolygon',
      `${name} must be Polygon or MultiPolygon geometry.`
    );
    featuresByName.set(name, feature);
  }

  return featuresByName;
};

const validateRegionDefinitions = (featuresByName) => {
  const assigned = new Map();

  for (const region of REGION_DEFINITIONS) {
    assert(region.id && region.name && region.reading, `Region definition is missing id/name/reading: ${JSON.stringify(region)}`);
    assert(Array.isArray(region.prefectures) && region.prefectures.length > 0, `${region.name} must list prefectures.`);

    for (const prefectureName of region.prefectures) {
      assert(featuresByName.has(prefectureName), `${region.name} references missing prefecture: ${prefectureName}`);
      assert(!assigned.has(prefectureName), `${prefectureName} is assigned to both ${assigned.get(prefectureName)} and ${region.name}.`);
      assigned.set(prefectureName, region.name);
    }
  }

  const unassigned = [...featuresByName.keys()].filter((name) => !assigned.has(name));
  assert(unassigned.length === 0, `Unassigned prefectures: ${unassigned.join(', ')}`);
};

const dissolveRegion = (region, featuresByName) => {
  const inputFeatures = region.prefectures.map((name) => cloneFeature(featuresByName.get(name)));
  const dissolved = inputFeatures.length === 1
    ? inputFeatures[0]
    : union(featureCollection(inputFeatures));

  assert(dissolved, `Unable to dissolve region: ${region.name}`);
  assert(
    dissolved.geometry?.type === 'Polygon' || dissolved.geometry?.type === 'MultiPolygon',
    `${region.name} dissolved to unsupported geometry type: ${dissolved.geometry?.type}`
  );

  return {
    type: 'Feature',
    id: region.id,
    bbox: bbox(dissolved),
    properties: {
      name: region.name,
      reading: region.reading,
      prefectures: region.prefectures,
    },
    geometry: dissolved.geometry,
  };
};

const main = () => {
  const prefectures = readJson(prefecturesPath);
  const featuresByName = getPrefectureFeaturesByName(prefectures);
  validateRegionDefinitions(featuresByName);

  const features = REGION_DEFINITIONS.map((region) => rewind(dissolveRegion(region, featuresByName), { reverse: true }));
  const regions = {
    type: 'FeatureCollection',
    bbox: bbox(featureCollection(features)),
    features,
  };

  fs.writeFileSync(outputPath, `${JSON.stringify(regions)}\n`);
  console.log(`Wrote ${path.relative(rootDir, outputPath)} with ${features.length} dissolved regions.`);
};

main();
