import { MongoClient } from 'mongodb';
const mongoUrl = 'mongodb://localhost:27017/';

/**
 * Saves an array or result objects into the database.
 */
export async function saveToDb(res, batchId) {
  try {
    const entry = res.map(r => {
        return {
          _id: r.id,
          originalRecord: r.originalRecord.toString(),
          validatedRecord: r.validatedRecord.toString(),
          results: r.results,
          updateResponse: r.updateResponse
        }
    });
    const database = await MongoClient.connect(mongoUrl);
    const validateDb = await database.db('validate');
    const result = await validateDb.collection(batchId).insertMany(entry);
    database.close();
    return result;
  } catch (err) {
    console.log("ERROR! " + err)
    return err;
  }
}
