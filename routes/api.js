/*
*
*
*       Complete the API routing below
*
*
*/

'use strict';

var expect = require('chai').expect;
var MongoClient = require('mongodb');
var ObjectId = require('mongodb').ObjectID;

const CONNECTION_STRING = process.env.DB; //MongoClient.connect(CONNECTION_STRING, function(err, db) {});

module.exports = function (app) {
  let issuesCollection;
  MongoClient.connect(CONNECTION_STRING, (err, client) => {
    if (err) {
      throw err;
    }
    console.log('successfully connected to database');
    issuesCollection = client.db('issue-tracker').collection('issues');
    
  });
  app.route('/api/issues/:project')
  
      .get(async function (req, res, next){
        var project = req.params.project;
        let filter = {...req.query, project};
        if (filter.open) {
          if (filter.open === 'false') {
            filter.open = false;
          }
          if (filter.open === 'true') {
            filter.open = true;
          }
        }
        let issues;
        try {
          issues = await issuesCollection.find(filter).toArray();
        } catch (e) {
          console.log(e);
          next(e);
        }
        res.json(issues);
      })

      .post(async function (req, res, next){
        var project = req.params.project;
        const { issue_title, issue_text, created_by, assigned_to, status_text } = req.body;
        if (!issue_title || !issue_text || !created_by) {
          return res.send('missing required fields');
        }
        let response;
        try {
          const now = new Date();
          response = await issuesCollection.insertOne({
            project,
            issue_title,
            issue_text,
            created_by,
            assigned_to: assigned_to || '',
            status_text: status_text || '',
            created_on: now,
            updated_on: now,
            open: true
          });
        } catch (e) {
          next(e);
        }
        
        res.json(response.ops[0]);
      })

      .put(async function (req, res, next){
        var project = req.params.project;
        const propsToUpdate = Object.keys(req.body).reduce((q, field) => {
          if (!req.body[field] || field === '_id') {
            return q;
          }
          if (field === 'open' && req.body['open']) {
            if (req.body['open'] === 'false') {
              q.open = false;
              return q;
            }
            if (req.body['open'] === 'true') {
              q.open = true;
              return q;
            }
          }
          q[field] = req.body[field];
          return q;
        }, {});
        if (Object.keys(propsToUpdate).length === 0) {
          return res.send('no updated field sent');
        }
        let result;
        try {
          propsToUpdate.updated_on = new Date();
          result = await issuesCollection.updateOne({ _id: ObjectId(req.body._id) }, { $set: propsToUpdate });
        } catch (e) {
          console.log(e);
          return res.send(`could not update ${req.body._id}`);
        }
        if (result.matchedCount === 1 && result.modifiedCount === 1) {
          return res.send('successfully updated');
        }
        return res.send(`could not update ${req.body._id}`);
      })

      .delete(async function (req, res){
        var project = req.params.project;
        if (!req.body._id) {
          return res.send('_id error');
        }
        let result;
        try {
          result = await issuesCollection.deleteOne({ _id: ObjectId(req.body._id) });
        } catch (e) {
          console.log(e);
          return res.send(`could not delete ${req.body._id}`);
        }
        if (result.deletedCount !== 1) {
          return res.send(`could not delete ${req.body._id}`);
        }
        return res.send(`deleted ${req.body._id}`);
      });
  
    
};
