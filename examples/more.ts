import * as dayjs from "dayjs";
import { ClickhouseOrm, DATA_TYPE, ModelSyncTableConfig, ClickhouseOrmModel } from "../lib/index";
import { clientConfig } from "../mock";

/**
 * defined Model
 */
const table1Schema: ModelSyncTableConfig<{
  status?: number;
  time: Date;
  browser?: string;
  browser_v?: string;
}> = {
  tableName: "table1",
  schema: {
    time: { type: DATA_TYPE.DateTime, default: Date },
    status: { type: DATA_TYPE.Int32 },
    browser: { type: DATA_TYPE.LowCardinality(DATA_TYPE.String) },
    browser_v: { type: DATA_TYPE.String },
  },
  options: `ENGINE = MergeTree
  PARTITION BY toYYYYMM(time)
  ORDER BY time`,
  autoCreate: true,
  autoSync: true,
};

/**
 * new instance
 */
const db = {
  name: "orm_test",
};
const chOrm = ClickhouseOrm({
  client: clientConfig,
  db,
  debug: true,
});

if (!chOrm) {
  throw new Error("Failed to initialize ClickhouseOrm");
}

const doDemo = async () => {
  // create database 'orm_test'
  await chOrm.createDatabase();

  // register schema and create [if] table
  const Table1Model = await chOrm.model(table1Schema);

  // chOrm.client: TimonKK/ClickHouse instance
  await chOrm.client
    .query(`select * from orm_test.table1 limit 3`)
    .toPromise()
    .then((res) => {
      console.log("Use sql:", res);
    });

  // query example 1
  await queryExample1({
    Model: Table1Model,
    status: 1,
    beginTime: dayjs().subtract(1, "day").format("YYYY-MM-DD HH:mm:ss"),
    endTime: dayjs().format("YYYY-MM-DD HH:mm:ss"),
  }).then((res) => {
    console.log("queryExample1:", res);
  });

  // count example 1
  await countExample1({
    Model: Table1Model,
  }).then((res) => {
    console.log("countExample1:", res);
  });

  // group example 1
  await groupExample1({
    Model: Table1Model,
  }).then((res) => {
    console.log("groupExample1:", res);
  });

  // find array: SELECT xx from (SELECT * from table)
  await findArrayExample({
    Model: Table1Model,
  }).then((res) => {
    console.log("findArrayExample:", res);
  });

  // insertMany example
  await insertManyExample({
    Model: Table1Model,
  }).then((res) => {
    console.log("insertManyExample:", res);
  });

  // insertMany example2
  await insertManyExample2({
    Model: Table1Model,
  }).then((res) => {
    console.log("insertManyExample2:", res);
  });

  // delete example
  await deleteExample({
    Model: Table1Model,
  }).then((res) => {
    console.log("deleteExample:", res);
  });
};

const queryExample1 = ({ Model, status, beginTime, endTime }) => {
  let wheres: string[] = [],
    where: any = "";
  if (status) wheres.push(`status='${status}'`);
  if (beginTime) wheres.push(`time>='${beginTime}'`);
  if (endTime) wheres.push(`time<='${endTime}'`);
  if (wheres.length > 0) where = wheres.join(" and ");

  return (
    Model as ClickhouseOrmModel<{
      status?: number;
      time: Date;
      browser?: string;
      browser_v?: string;
    }>
  ).find({
    where,
    select: `*`,
    orderBy: "time ASC",
    limit: 5,
  });
};

const countExample1 = ({ Model }) => {
  return Model.find({
    select: `count(*) AS total`,
  });
};

const groupExample1 = ({ Model }) => {
  return Model.find({
    select: `status,browser`,
    groupBy: "status,browser",
  });
};

const findArrayExample = ({ Model }) => {
  return Model.find([
    {
      select: `browser`,
      groupBy: "browser",
    },
    {
      select: `count() as browserTotal`,
    },
  ]);
};

const insertManyExample = ({ Model }) => {
  const list = [
    { status: 2, browser: "IE", browser_v: "10.0.1.21" },
    { status: 2, browser: "FF", browser_v: "2.0.3" },
    { status: 3, browser: "IE", browser_v: "1.1.1" },
  ];

  return Model.insertMany(
    list.map((item) => {
      const data = Model.build();
      // set value
      data.time = new Date();
      data.status = item.status;
      data.browser = item.browser;
      data.browser_v = item.browser_v;
      return data;
    })
  );
};

const insertManyExample2 = ({ Model }) => {
  const list = [
    { status: 4, browser: "Chrome", browser_v: "10.0.1.21" },
    { status: 5, browser: "Chrome", browser_v: "2.0.3" },
  ];

  return Model.insertMany(list);
};

const deleteExample = ({ Model }) => {
  return Model.delete({
    where: `browser='Chrome'`,
  });
};

doDemo();
