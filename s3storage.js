/**
 * Copyright 2014 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/
var AWS = require('aws-sdk');
var when = require('when');
var util = require('util');
var fs = require('fs');
var uuidv1 = require('uuid/v1');

var settings;
var appname;
var brand_id;
var s3 = null;
var apigateway = null;
var route53 = null;
var lambda = null;
var s3BucketName = null;
var currentFlowRev = {};
var currentSettingsRev = null;
var currentCredRev = null;

var libraryCache = {};

function prepopulateFlows(resolve) {
    var params = {};
    params.Bucket = s3BucketName;
    params.Key = brandId + "/" + "flow.json";
    console.log("prepop flows");
    s3.getObject(params, function (err, doc) {
        if (err) {
            var promises = [];
            if (fs.existsSync(__dirname + "/defaults/flow.json")) {
                try {
                    var flow = fs.readFileSync(__dirname + "/defaults/flow.json", "utf8");
                    var flows = JSON.parse(flow);
                    console.log(">> Adding default flow");
                    promises.push(s3storage.saveFlows(flows));
                } catch (err) {
                    console.log(">> Failed to save default flow");
                    console.log(err);
                }
            } else {
                console.log(">> No default flow found");
            }
            when.settle(promises).then(function () {
                resolve();
            });
        } else {
            resolve();
        }
    });
}


var s3storage = {
    init: function (_settings) {
        settings = _settings;
        s3BucketName = settings.awsS3Bucket;
        brandId = settings.brand_id || process.env.BRAND_ID;
        appname = settings.awsS3Appname || require('os').hostname();
        AWS.config.region = settings.awsRegion || 'eu-west-1';

        return when.promise(function (resolve, reject) {
            s3 = new AWS.S3();
            apigateway = new AWS.APIGateway();
            route53 = new AWS.Route53();
            lambda = new AWS.Lambda();
            if (!s3BucketName) {
                s3BucketName = data.Owner.DisplayName + "-node-red"
            }

            var params = { Bucket: s3BucketName };
            s3.listObjects(params, function (err, data) {
                if (err) {
                    console.error("s3s get bucket error " + params);
                    s3.createBucket(params, function (err) {
                        if (err) {
                            reject("Failed to create bucket: " + err);
                        } else {
                            prepopulateFlows(resolve);
                        }
                    });
                } else {
                    prepopulateFlows(resolve);
                    resolve();
                }
            });
        });
    },

    getFlows: function () {
        return this.getArrayData("flow");
    },
    saveFlows: function (flows) {
        return this.saveData("flow", flows);
    },
    getCredentials: function () {
        return this.getData("credential");
    },
    saveCredentials: function (creds) {
        return this.saveData("credential", creds);
    },
    getSettings: function () {
        return this.getData("settings");
    },
    saveSettings: function (creds) {
        return this.saveData("settings", creds);
    },
    getData: function (entryType) {
        return when.promise(function (resolve, reject) {
            var params = {};
            params.Bucket = s3BucketName;
            params.Key = brandId + "/" + entryType + ".json";
            s3.getObject(params, function (err, doc) {
                if (err) {
                    if (err.code == 'NoSuchKey') {
                        console.warn("no entry found for key " + params.Key);
                        resolve({});
                    } else {
                        console.error(err);
                        reject(err.toString());
                    }
                } else {
                    var strObj = doc.Body.toString();
                    var dataEntry = JSON.parse(strObj);
                    resolve(dataEntry);
                }
            });
        });
    },
    getArrayData: function (entryType) {
        return when.promise(function (resolve, reject) {
            var params = {};
            params.Bucket = s3BucketName;
            params.Key = brandId + "/" + entryType + ".json";
            s3.getObject(params, function (err, doc) {
                if (err) {
                    if (err.code == 'NoSuchKey') {
                        console.warn("no entry found for key " + params.Key);
                        resolve([]);
                    } else {
                        console.error(err);
                        reject(err.toString());
                    }
                } else {
                    var strObj = doc.Body.toString();
                    var dataEntry = JSON.parse(strObj);
                    resolve(dataEntry);
                }
            });
        });
    },
    saveData: function (entryType, dataEntry) {
        console.log("save " + entryType);
        return when.promise(function (resolve, reject) {

            var params = {};
            params.Bucket = s3BucketName;
            params.Key = brandId + "/" + entryType + ".json";
            params.Body = JSON.stringify(dataEntry);

            s3.upload(params, function (err, doc) {
                if (err) {
                    reject(err.toString());
                } else {
                    // Check If domain exist or not
                    // apigateway.getDomainName({ domainName: brandId + '-api.wsuite.com' }, function (err, domainData) {
                    //     if (err) {
                    //         if (err.code == 'NotFoundException') {
                    //             // Creating lambda function for Brand
                    //             createBrandLambdFunction(brandId).then((data) => {
                    //                 // Creating new stage for brand
                    //                 createStage(brandId).then((data) => {
                    //                     console.log('Creating new domain..');
                    //                     createDomain(brandId).then((domainData) => {
                    //                         var edgeDomain = domainData.distributionDomainName;
                    //                         console.log('Creating base path..');
                    //                         createBasePathMapping(brandId).then((brandId, data) => {
                    //                             console.log('Adding permissions..');
                    //                             lambdaAddPermission(brandId).then((data) => {
                    //                                 console.log('Creating record set..');
                    //                                 createRecordSet(brandId, edgeDomain).then((data) => {
                    //                                     resolve(data);
                    //                                 });
                    //                             });
                    //                         });
                    //                     });
                    //                 });
                    //             });

                    //             // Create new domain
                    //             // var params = {
                    //             //     domainName: brandId + '-api.wsuite.com',
                    //             //     certificateArn: 'arn:aws:acm:us-east-1:133013689155:certificate/74991899-d4db-40ea-a32d-fc8901abf083',
                    //             //     endpointConfiguration: {
                    //             //         types: [
                    //             //             'EDGE'
                    //             //         ]
                    //             //     }
                    //             // };
                    //             // apigateway.createDomainName(params, function (err, data) {
                    //             //     if (err) {
                    //             //         reject(err);
                    //             //     }
                    //             //     else {
                    //             //         var edgeDomain = data.distributionDomainName;
                    //             //         var params = {
                    //             //             domainName: brandId + '-api.wsuite.com',
                    //             //             restApiId: '6qegl7yi77',
                    //             //             basePath: '',
                    //             //             stage: 'production'
                    //             //         };
                    //             //         apigateway.createBasePathMapping(params, function (err, data) {
                    //             //             if (err) {
                    //             //                 console.log(err)
                    //             //                 reject(err);
                    //             //             } else {
                    //             //                 console.log('Creating DNS Record..');
                    //             //                 var params = {
                    //             //                     ChangeBatch: {
                    //             //                         Changes: [
                    //             //                             {
                    //             //                                 Action: "CREATE",
                    //             //                                 ResourceRecordSet: {
                    //             //                                     Name: brandId + '-api.wsuite.com',
                    //             //                                     ResourceRecords: [
                    //             //                                         {
                    //             //                                             Value: edgeDomain
                    //             //                                         }
                    //             //                                     ],
                    //             //                                     TTL: 60,
                    //             //                                     Type: "CNAME"
                    //             //                                 }
                    //             //                             }
                    //             //                         ]
                    //             //                     },
                    //             //                     HostedZoneId: "ZLUNFBW7I9KIX"
                    //             //                 };
                    //             //                 route53.changeResourceRecordSets(params, function (err, data) {
                    //             //                     if (err) {
                    //             //                         reject(err);
                    //             //                     } else {
                    //             //                         console.log(data);
                    //             //                     }
                    //             //                 });
                    //             //             }
                    //             //         });

                    //             //     }
                    //             // });
                    //         }
                    //     } else {
                    //         console.log('Domain already exist.');
                    //         resolve();
                    //     }
                    // });
                    resolve();
                }
            });
        });
    },
    saveLibraryEntry: function (type, path, meta, body) {
        console.log("save library entry: " + type + ":" + path);
        if (path.substr(0) != "/") {
            path = "/" + path;
        }
        var key = brandId + "/lib/" + type + path;
        return when.promise(function (resolve, reject) {
            var params = {};
            params.Bucket = s3BucketName;
            params.Key = brandId + "/lib/" + type + path;;
            params.Body = JSON.stringify(body);
            if (meta) {
                var metaStr = JSON.stringify(meta);
                params.Metadata = { nrmeta: metaStr };
            }

            s3.putObject(params, function (err, data) {
                if (err) {
                    reject(err.toString());
                } else {
                    resolve();
                }
            });
        });
    },
    getLibraryEntry: function (type, path) {
        console.log("get library entry: " + type + ":" + path);
        return when.promise(function (resolve, reject) {

            var params = {};
            params.Bucket = s3BucketName;
            params.Prefix = brandId + "/lib/" + type + (path.substr(0) != "/" ? "/" : "") + path;
            params.Delimiter = "/";
            s3.listObjects(params, function (err, data) {
                if (err) {
                    if (err.code == 'NoSuchKey') {
                        console.warn("no entry found for key " + params.Key);
                        reject(err.toString());
                    } else {
                        console.error(err);
                        reject(err.toString());
                    }
                } else {
                    if (data.Contents.length == 1 && data.Contents[0].Key == data.Prefix) {
                        var getParams = { Bucket: s3BucketName, Key: data.Prefix };
                        s3.getObject(getParams, function (err, doc) {
                            if (err) {
                                reject(err.toString());
                            }
                            else {
                                var strObj = doc.Body.toString();
                                var dataEntry = JSON.parse(strObj);
                                resolve(dataEntry);
                            }

                        });
                    }
                    else {
                        var resultData = [];
                        for (var i = 0; i < data.CommonPrefixes.length; i++) {
                            var li = data.CommonPrefixes[i];
                            resultData.push(li['Prefix'].substr(data.Prefix.length,
                                li['Prefix'].length - (data.Prefix.length + 1)));
                        }
                        var prefixes = {};
                        for (var i = 0; i < data.Contents.length; i++) {
                            var li = data.Contents[i];
                            var getParams = { Bucket: s3BucketName, Key: li.Key };
                            s3.headObject(getParams, function (err, objData) {
                                console.log(this.request.httpRequest.path);
                                var entryName = this.request.httpRequest.path.toString();

                                entryName = entryName.substr(data.Prefix.length + 1,
                                    entryName.length - (data.Prefix.length + 1));
                                var entryData = {};
                                if (objData.Metadata["nrmeta"]) {

                                    entryData = JSON.parse(objData.Metadata.nrmeta);
                                }

                                entryData.fn = entryName;
                                resultData.push(entryData);
                                if (resultData.length == (data.CommonPrefixes.length + data.Contents.length)) {
                                    resolve(resultData);
                                }

                            });
                        }

                    }

                }
            });
        });
    }

};

var createBrandLambdFunction = function (brandId) {
    return when.promise(function (resolve, reject) {
        var params = {
            Code: { /* required */
                S3Bucket: 'static.wsuite.com',
                S3Key: 'wsuite-api-handler.zip'
            },
            FunctionName: 'wsuite-api-handler-' + brandId,
            Handler: 'lambda.handler',
            Role: 'arn:aws:iam::133013689155:role/lambda_basic_execution',
            Runtime: 'nodejs6.10',
            Description: 'lambda function for brand ' + brandId,
            Environment: {
                Variables: {
                    'BRAND_ID': brandId,
                    'S3_BUCKET': 'wsuite-alb',
                    'Name': 'wsuite-api-handler-' + brandId
                }
            },
            MemorySize: 128,
            Timeout: 900
        };
        lambda.createFunction(params, function (err, data) {
            if (err) {
                reject(err);
            }
            else {
                resolve(data);
            }
        });
    });
};

var createStage = function (brandId) {
    return when.promise(function (resolve, reject) {
        var params = {
            deploymentId: 'a7b3p9',
            restApiId: '6qegl7yi77',
            stageName: brandId,
            variables: {
                'BRAND_ID': brandId
            }
        };
        apigateway.createStage(params, function (err, data) {
            if (err) {
                reject(err);
            }
            else {
                resolve(data);
            }
        });
    });
}

var lambdaAddPermission = function (brandId) {
    return when.promise(function (resolve, reject) {
        var params = {
            Action: "lambda:InvokeFunction",
            FunctionName: "arn:aws:lambda:us-east-1:133013689155:function:wsuite-api-handler-"+brandId,
            Principal: "apigateway.amazonaws.com",
            SourceArn: "arn:aws:execute-api:us-east-1:133013689155:6qegl7yi77/*/*/*",
            StatementId: uuidv1()
        };
        lambda.addPermission(params, function (err, data) {
            if (err) {
                reject(err);
            }
            else {
                resolve(data);
            }
        });
    });
}

var createDomain = function (brandId) {
    return when.promise(function (resolve, reject) {
        var params = {
            domainName: brandId + '-api.wsuite.com',
            certificateArn: 'arn:aws:acm:us-east-1:133013689155:certificate/74991899-d4db-40ea-a32d-fc8901abf083',
            endpointConfiguration: {
                types: [
                    'EDGE'
                ]
            }
        };
        apigateway.createDomainName(params, function (err, data) {
            if (err) {
                reject(err);
            }
            else {
                resolve(data);
            }
        });
    });
}

var createBasePathMapping = function (brandId) {
    return when.promise(function (resolve, reject) {
        var params = {
            domainName: brandId + '-api.wsuite.com',
            restApiId: '6qegl7yi77',
            basePath: '',
            stage: brandId
        };
        apigateway.createBasePathMapping(params, function (err, data) {
            if (err) {
                reject(err);
            }
            else {
                resolve(brandId, data);
            }
        });
    });
}

var createRecordSet = function (brandId, edgeDomain) {
    return when.promise(function (resolve, reject) {
        var params = {
            ChangeBatch: {
                Changes: [
                    {
                        Action: "CREATE",
                        ResourceRecordSet: {
                            Name: brandId + '-api.wsuite.com',
                            ResourceRecords: [
                                {
                                    Value: edgeDomain
                                }
                            ],
                            TTL: 60,
                            Type: "CNAME"
                        }
                    }
                ]
            },
            HostedZoneId: "ZLUNFBW7I9KIX"
        };
        route53.changeResourceRecordSets(params, function (err, data) {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
}

module.exports = s3storage;
