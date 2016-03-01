/*global window, console, jasmine */
(function (db, describe, it, expect, beforeEach, afterEach) {
    'use strict';
    describe('db.open', function () {
        var indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.oIndexedDB || window.msIndexedDB;

        beforeEach(function (done) {
            this.dbName = guid();
            var req = indexedDB.deleteDatabase(this.dbName);

            req.onsuccess = function () {
                done();
            };

            req.onerror = function (e) {
                console.log('error deleting db', arguments);
                done(e);
            };

            req.onblocked = function (e) {
                console.log('db blocked on delete', arguments);
                done(e);
            };
        }, 10000);

        afterEach(function (done) {
            if (this.server && !this.server.isClosed()) {
                this.server.close();
            }
            var req = indexedDB.deleteDatabase(this.dbName);

            req.onsuccess = function (/* e */) {
                done();
            };

            req.onerror = function (e) {
                console.log('failed to delete db', arguments);
                done(e);
            };

            req.onblocked = function (e) {
                console.log('db blocked', arguments);
                done(e);
            };
        });

        it('should open a new instance successfully', function (done) {
            var spec = this;
            db.open({
                server: this.dbName,
                version: 1
            }).then(function (s) {
                spec.server = s;
                expect(spec.server).to.not.be.undefined;
                done();
            });
        });

        it('should normally reject open promise with store conflicting with Server methods', function (done) {
            db.open({
                server: this.dbName,
                version: 1,
                schema: {
                    query: {
                        key: {
                            keyPath: 'id'
                        }
                    }
                }
            }).catch(function (err) {
                expect(err.toString()).to.contain('conflicts with db.js method');
                done();
            });
        });

        it('should not add stores to server using noServerMethods', function (done) {
            var spec = this;
            db.open({
                server: this.dbName,
                version: 1,
                noServerMethods: true,
                schema: {
                    test: {
                        key: {
                            keyPath: 'id'
                        }
                    },
                    query: {
                        key: {
                            keyPath: 'id'
                        }
                    }
                }
            }).then(function (s) {
                spec.server = s;
                expect(spec.server.test).to.be.undefined;
                expect(spec.server.query).to.be.a(typeof Function);
                done();
            });
        });

        it('should use the provided schema', function (done) {
            var spec = this;
            db.open({
                server: this.dbName,
                version: 1,
                schema: {
                    test: {
                        key: {
                            keyPath: 'id',
                            autoIncrement: true
                        },
                        indexes: {
                            x: {}
                        }
                    }
                }
            }).then(function (s) {
                s.close();
                var req = indexedDB.open(spec.dbName);
                req.onsuccess = function (e) {
                    var db = e.target.result;

                    expect(db.objectStoreNames.length).to.equal(1);
                    expect(db.objectStoreNames[ 0 ]).to.equal('test');

                    db.close();
                    done();
                };
            }, function (err) {
                console.log(err);
                done(err);
            });
        });

        it('should allow schemas without keypaths', function (done) {
            var spec = this;
            db.open({
                server: this.dbName,
                version: 1,
                schema: {
                    test: {}
                }
            }).then(function (s) {
                s.close();
                var req = indexedDB.open(spec.dbName);
                req.onsuccess = function (e) {
                    var db = e.target.result;

                    expect(db.objectStoreNames.length).to.equal(1);
                    expect(db.objectStoreNames[ 0 ]).to.equal('test');

                    db.close();
                    done();
                };
            }, function (err) {
                done(err);
            });
        });

        it('should skip creating existing object stores when migrating schema', function (done) {
            var spec = this;
            db.open({
                server: this.dbName,
                version: 1,
                schema: {
                    test: {}
                }
            }).then(function (s) {
                s.close();
                function migrated (ret) {
                    expect(ret).to.equal(true, 'schema migration failed');
                    done();
                }
                db.open({
                    server: spec.dbName,
                    version: 2,
                    schema: {
                        test: {},
                        extra: {}
                    }
                }).then(function (s) {
                    s.close();
                    migrated(true);
                }, function (/* err */) {
                    migrated(false);
                });
            }, function (err) {
                done(err);
            });
        });

        it('should remove object stores no longer defined in the schema', function(done){
            var spec = this;
            db.open({
                server: this.dbName,
                version: 1,
                schema: {
                    test_1: {},
                    test_2: {}
                }
            }).then(function (s) {
                s.close();

                db.open({
                   server: spec.dbName,
                   version: 2,
                   schema: {
                        test_2: {}
                    }
                }).then(function(s){
                    s.close();

                    var req = indexedDB.open(spec.dbName);
                    req.onsuccess = function (e) {
                        var db = e.target.result;

                        expect(db.objectStoreNames.length).to.equal(1);
                        expect(db.objectStoreNames[ 0 ]).to.equal('test_2');

                        db.close();
                        done();
                    };
                }, function (err) {
                    done(err);
                });
            }, function (err) {
                done(err);
            });
        });

    });
}(window.db, window.describe, window.it, window.expect, window.beforeEach, window.afterEach));
