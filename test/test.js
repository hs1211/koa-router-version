'use strict';

const request = require('supertest');
const expect = require('chai').expect;
const Koa = require('koa');
const KoaRouter = require('koa-router');
const api = require('../index');

const handler = () => (ctx, next) => {
  ctx.body = (ctx.body || []);
  return next();
};

describe('KoaRouterVersion', function() {
  let app;
  let server;

  before(() => {
    app = new Koa();
    let router = new KoaRouter();
    router.get('todo.list', '/todo', api.version(
      {
        '1.1.0': handler(),
        '1.0.0': handler(),
        '2.0.0': handler()
      }
    ));
    router.get('todo2.list', '/todo2', api.version({'1.0.0': handler()}));
    router.get('todo3.list', '/todo3', api.version({'1.3.0': handler()}, { fallbackLatest:true }));
    app.use(router.routes());
    server = app.listen(3001);
  });

  after(async () => {
    await server.close();
  });

  it('should match a single version', function(done) {

    request(server)
      .get('/todo2')
      .end((err, res) => {
        expect(res.statusCode).to.equal(200);
        expect(res.headers['x-api-version']).to.equal('1.0.0');
        done();
      });
  });

  it('should match the latest version', function(done) {

    request(server)
      .get('/todo')
      .end((err, res) => {
        expect(res.statusCode).to.equal(200);
        expect(res.headers['x-api-version']).to.equal('2.0.0');
        done();
      });
  });

  it('should respect request header with exact version', function(done) {

    request(server)
      .get('/todo')
      .set('Accept-Version', '1.0.0')
      .end((err, res) => {
        expect(res.statusCode).to.equal(200);
        expect(res.headers['x-api-version']).to.equal('1.0.0');
        done();
      });
  });

  it('should respect request header with caret version', function(done) {

    request(server)
      .get('/todo')
      .set('Accept-Version', '^1.0')
      .end((err, res) => {
        expect(res.statusCode).to.equal(200);
        expect(res.headers['x-api-version']).to.equal('1.1.0');
        done();
      });
  });

  it('should respect request header with more versions', function(done) {

    request(server)
      .get('/todo')
      .set('Accept-Version', '^2.0')
      .end((err, res) => {
        expect(res.statusCode).to.equal(200);
        expect(res.headers['x-api-version']).to.equal('2.0.0');
        done();
      });
  });

  it('should throw an error if requested an invalid version', function(done) {

    request(server)
      .get('/todo')
      .set('Accept-Version', '^3.0')
      .end(function(err, res) {
        expect(res.statusCode).to.equal(400);
        expect(res.text).to.equal('^3.0 version is not supported');
        done();
      });
  });

  it('should use latest if requested an invalid version', function(done) {

    request(server)
      .get('/todo3')
      .set('Accept-Version', '^3.0')
      .end(function(err, res) {
        expect(res.statusCode).to.equal(200);
        expect(res.headers['x-api-version']).to.equal('1.3.0');
        done();
      });
  });

});