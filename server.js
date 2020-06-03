var http = require('http');
const express = require('express');
const app = express();
const mysql = require('mysql');
var bodyParser = require('body-parser')

const port = 3000
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())


app.get('/hello', (req, res) => res.send('Hello World!'))
app.listen(port, () => console.log(`Odin app listening at http://localhost:${port}`))

const connection = mysql.createConnection({
    host: 'remotemysql.com',
    user: //redacted,
    password: //redacted,
    database: //redacted
  });

connection.connect((err) => {
    if (err) throw err;
    console.log('Connected!');
  });

app.put('/', (req, results) => {
  // Given username, email, prefferred contact, and phone_number
    console.log(req.body);
    connection.beginTransaction(function(err) {
        connection.query("INSERT INTO user(username) VALUES('" + req.body.username + "')",
        (err, res) => {
            if (err) { 
                console.log("Error occurred with the insert");
                connection.rollback(function() {
                    results.sendStatus(500);
                    throw err;
                });
            }});
        
        console.log("First part good");
        connection.query("SELECT id FROM user WHERE username='" + req.body.username  + "'",
        (err, res) => {
            console.log("Second query passed: ");
            if (err) {
                connection.rollback(function()
                {
                    console.log("Error occured with the select");
                    results.sendStatus(500);
                    throw err;
                });
            } else {
                let data  = {user_id: res[0].id,
                  phone_number: req.body.phone_number, 
                  email_address: req.body.email_address, 
                  preferred_contact_method: req.body.preferred_contact_method}
                
                connection.query("INSERT INTO contact SET ?", data, (err, res) => {
                    if (err) {
                      console.log("Insert by id");
                      connection.rollback(function()
                      {
                        console.log("error query");
                        results.sendStatus(500);
                        throw err;
                      });
                    } else {
                        console.log("last query passed");
                        connection.commit(function (err) {
                          console.log('Commiting transaction.....');
                          if (err) {
                              return connection.rollback(function () {
                                  throw err;
                              });
                        }});
                        results.json({'user id': data.user_id});                   
                      }
                  });
                }
        });
    });
});

app.post('/', (req, results) => {
    // Change preferred contact, given id and preferred_contact method
    console.log(req.body);
    let sql = "UPDATE contact SET preferred_contact_method='" + req.body.preferred_contact_method + "' WHERE user_id ='" + req.body.user_id + "'";
    let query = connection.query(sql, (err, res) => 
    {
        if (err) {
          results.sendStatus(500);
            throw err;
        }
        results.sendStatus(200);
    });
    console.log(query.sql);
});

app.get('/', (req, results) => {
  // If user_id is given, return that contact and user
  // If no user_id is given, return list of all contact and users
  if (Object.keys(req.body).length == 0) {
      let sql = "SELECT * FROM contact INNER JOIN user ON contact.user_id=user.id";
      let query = connection.query(sql, req.body.user_id, (err, res) => 
      {
          if (err) {
              results.sendStatus(500);
              throw err;
          }
          results.json(JSON.stringify(res));
      });
  }
  else
  {
    let sql = "SELECT * FROM contact INNER JOIN user ON (user.id=? AND contact.user_id=?)";
    console.log(req.body.user_id);
    let query = connection.query(sql, [req.body.user_id, req.body.user_id], (err, res) => 
    {
      if (err) {
          results.sendStatus(500);
          throw err;
      }
      console.log("dog");
      console.log(res);
      results.json(JSON.stringify(res));
    });
 }
});

app.delete('/', (req, results) => {
  // Delete row given an user_id
  connection.beginTransaction(function(err) {
      console.log("Delete row of user_id = " + req.body.user_id);
      connection.query("DELETE FROM contact WHERE user_id='" + req.body.user_id + "'",
      (err, res) => {
          console.log(res);
          if (err) {
              console.log("error 1")
              connection.rollback(function()
              {
                  results.sendStatus(500);
                  throw err;
              });
          }
      })

      console.log("second delete query");
      connection.query("DELETE FROM user WHERE id='" + req.body.user_id + "'",
      (err, res) => {
          if (err) {
              console.log("error2")
              connection.rollback(function()
              {
                  results.sendStatus(500);
                  throw err;
              });
          }
      });
      
      connection.commit(function (err) {
        console.log('Commiting transaction.....');
        if (err) {
            return connection.rollback(function () {
                results.sendStatus(500);
                throw err;
            });
      }});
    });
      results.sendStatus(200);
});