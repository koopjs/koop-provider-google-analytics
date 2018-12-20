# koop-provider-google-analytics

[Getting Started](#Getting-Started)  
[Service endpoint pattern](#Service-endpoint-pattern)  
[Sample requests](#Sample-requests)

## Getting Started

### Setup

This provider ships with a sample instance `server.js` which registers koop-provider-google-analytics. For the provider to work properly a few variables must be set for the environment or in a configuration file.

#### Environment Variables 
|Variable|Description|Required|
|---|---|---|
| GOOGLE_VIEW_ID | The unique ID used to retrieve the Google Analytics data. Available through your Google Analytics dashboard. | Yes |
| GOOGLE_ANALYTICS_TIMEZONE | String representing the timezone used to define the [Google Analytics view/report data](https://support.google.com/analytics/answer/1010249?hl=en). See [moment/timezone](https://momentjs.com/timezone/) for valid timezones. | Yes |
| GOOGLE_CLIENT_EMAIL | The Google Analytics client email generated by Google for connecting to the API. | Yes |
| GOOGLE_PRIVATE_KEY | The Google Analytics private key generated by Google for connecting their API. Must be base64 encoded (due to multiline key)| Yes |
| GOOGLE_START_DATE |  Beginning of the time range used for analytics reports in `YYYY-MM-DD` format.  Defaults to 2005-01-01. | No |
| ANALYTICS_CACHE_TTL | Number of seconds to cache analytics data until re-retrieved from Google Analytics.  If not set, there will be no caching. | No |

#### Config file
If you prefer, you can set the required variables in the Koop configuration file rather than as environment variables.  See [config/default.js.example](config/default.js.example) for specifics.  The configuration file can also be use to customize the provider's support for additional Google Analytics dimensions and metrics. The [config/default.js.example](config/default.js.example) includes examples of adding dimensions and metrics not already defined in [src/constants-and-lookups.js](src/constants-and-lookups.js).  You will need to remove `.example` from the filename in order for the `config` npm to read and register this file.

With the above environment variables and or config set, the Koop server can be started with:
```
  node server.js
```

The Koop API will be listening on port 8080.

## Service endpoint pattern

The service endpoint conform to the following pattern:

`http://<domain>/metrics/:metric/:dimension/FeatureServer/0/query?<query-parameters>`

### Metric parameter
The `:metric` parameter indicates the requested metric(s).  Multiple metrics can be requested by concatenating values with `::`, e.g `views::uniqueViews`
|value|description|
|---|---|
|`views`|Number of page views|
|`uniqueViews`|Number of unique page views|
|`sessions`|Number of page views|
|`totalEvents`|Number of total events|
|other metrics| Additional metrics set in the the config file |

### Dimension parameter
The `:dimension` parameter indicates the requested dimension(s) for slicing the data.  Multiple dimensions can be requested by concatenating values with `::`, e.g `month::country`

|value|description|
|---|---|
|`hour`| Slice data by timestamp in hourly intervals |
|`day`| Slice data by timestamp in daily intervals |
|`week`| Slice data by timestamp in weekly intervals |
|`month`| Slice data by timestamp in monthly intervals |
|`country`| Slice data by country |
|`eventCategory`| Slice data by eventCategory |
|`eventAction`| Slice data by eventAction |
|`eventLabel`| Slice data by eventAction |
|`hostname`| Slice data by hostname |
|other dimensions| Additional dimensions set in the the config file |
|`none`| Don't slice data by any dimensions. Concatenated dimesions will override. |

### Query parameters
Query parameters further refine the metrics request and are optional. Below are a list of the currently supported query parameters and their default values:

|name|type|description|default|
|---|---|---|---|
|`token`|`string`| ArcGIS user token. Any requests without a token, or an invalid token are rejected. The token can also be passed in an Authorization header.  | |
|`time`|`string`|Comma separated date/date-time range for the requested metrics. Can be unix timestamp or `YYYY-MM-DD` strings, e.g. `2017-01-01,2018-01-01` or `1483257600,1514793600`. Use "null" to omit part of the range.| 2000-01-01  to current date |
|`where`|`string`|A SQL style `WHERE` clause. [See notes below](#where-parameter-rules).||

#### `where` parameter rules
This provider converts the SQL found in the `where` parameter to arrays of Google Analytics metric and dimension filter clauses. Unfortuntately, some `where`s will not be translatable to filter clauses due to Google Analytics business rules. The provider will give informative errors when a `where` cannot be translated, but general guidelines are provided below:  
1) Predicates of a given type (metrics or dimensions) cannot be combined with more than one type of logical operator. For example, `view > 100 OR uniqueViews > 10 AND sessions > 5` will not work.
2) Logical combination of metric and dimension predicates must be with `AND`, e.g. `(sessions > 100) AND (country = 'Canada')`.
3) Currently supported operators for metric predicates include `=`, `<`, `>`. Combine predicates with `OR` to achieve `<=` or `>=`, e.g. `(sessions > 100 OR sessions >= 100)`.
4) The only supported operator for dimension predicates is `=`.
5) Complex `where`s that include multiple metric and dimension predicates should be partitioned by type (metric/dimension) with parenthesis, e.g `(sessions > 100 OR sessions >= 100) AND (country = 'Canada' OR country = 'Mexico')`.


### Feature Service query parameters
Since Koop employs the FeatureServer output service, you can use its subset of the ArcGIS REST API [parameters for feature service layers](https://developers.arcgis.com/rest/services-reference/query-feature-service-layer-.htm).

#### `outStatistics`
Of particular interest is the `outStatistics` parameter which can be used to calculate the count, minimum, maximum, average, standard deviation, or variance of a metric over a given dimension. Note, if you are interested in a total value of a metric (ie., sum) over a time range, it's most performant to do this by using a value of `none` for the dimension parameter and omit the `outStatistics` parameter.  If you are interested in the total value of a metric sliced by a non-time dimesion, set the `dimension` parameter appropriately and omit the `outStatistics` parameter.  See sample requests for additional details.

## Sample requests
1. [Monthly timeseries of page views for date range](#Monthly-timeseries-of-page-views-for-date-range)  
1. [Sum of all page views for date range](#Sum-of-all-page-views-for-date-range)  
1. [Average monthly page views for date range](#Average-monthly-page-views-for-date-range)  
1. [Sum of total events dimensioned by event category for a date range](#Sum-of-total-events-dimensioned-by-event-category-for-a-date-range)  
1. [Top ten session counts by country for a date range](#Top-ten-session-counts-by-country-for-a-date-range)
1. [Multiple metrics, multiple dimensions](#Multiple-metrics,-multiple-dimensions)
1. [Dimension by eventCategory and filter with where](#Dimension-by-eventCategory-and-filter-with-where)

**NOTE:* All request require a `token` parameter or `authorization` header with a valid user token.

### Monthly timeseries of page views for date range
`http://localhost:8080/metrics/views/month/FeatureServer/0/query?time=2017-01-01,2018-07-01`

Response:

```
{
    "objectIdFieldName": "OBJECTID",
    "globalIdFieldName": "",
    "hasZ": false,
    "hasM": false,
    "spatialReference": {
        "wkid": 4326
    },
    "fields": [
        {
            "name": "OBJECTID",
            "type": "esriFieldTypeOID",
            "alias": "OBJECTID",
            "sqlType": "sqlTypeOther",
            "domain": null,
            "defaultValue": null
        },
        {
            "name": "timestamp",
            "type": "esriFieldTypeDate",
            "alias": "timestamp",
            "sqlType": "sqlTypeOther",
            "domain": null,
            "defaultValue": null,
            "length": 36
        },
        {
            "name": "views",
            "type": "esriFieldTypeInteger",
            "alias": "views",
            "sqlType": "sqlTypeOther",
            "domain": null,
            "defaultValue": null
        }
    ],
    "features": [
        {
            "attributes": {
                "timestamp": 1485907199999,
                "views": 898118,
                "OBJECTID": 1003353633
            }
        },
        ...
        ...
        ...
        {
            "attributes": {
                "timestamp": 1533081599999,
                "views": 26983,
                "OBJECTID": 1924415847
            }
        }
    ],
    "exceededTransferLimit": false
}
```

### Sum of all page views for date range
`http://localhost:8080/metrics/views/none/FeatureServer/0/query?time=2017-01-01,2018-07-01`

Response:
```
{
    "objectIdFieldName": "OBJECTID",
    "globalIdFieldName": "",
    "hasZ": false,
    "hasM": false,
    "spatialReference": {
        "wkid": 4326
    },
    "fields": [
        {
            "name": "OBJECTID",
            "type": "esriFieldTypeOID",
            "alias": "OBJECTID",
            "sqlType": "sqlTypeOther",
            "domain": null,
            "defaultValue": null
        },
        {
            "name": "views",
            "type": "esriFieldTypeInteger",
            "alias": "views",
            "sqlType": "sqlTypeOther",
            "domain": null,
            "defaultValue": null
        }
    ],
    "features": [
        {
            "attributes": {
                "views": 28411690,
                "OBJECTID": 952929127
            }
        }
    ],
    "exceededTransferLimit": false
}
```

### Average monthly page views for date range
`http://localhost:8080/metrics/views/month/FeatureServer/0/query?time=2017-01-01,2018-07-01&outStatistics=[{"statisticType": "avg","onStatisticField": "views","outStatisticFieldName": "average_monthly_views"}]`

Response:

```
{
    "displayFieldName": "OBJECTID",
    "fields": [
        {
            "name": "average_monthly_views",
            "type": "esriFieldTypeDouble",
            "alias": "average_monthly_views",
            "sqlType": "sqlTypeOther",
            "domain": null,
            "defaultValue": null
        }
    ],
    "features": [
        {
            "attributes": {
                "average_monthly_views": 1687865.6923076923
            }
        }
    ]
}
```

### Sum of total events dimensioned by event category for a date range
`http://localhost:8080/metrics/totalEvents/eventCategory/FeatureServer/0/query?time=2017-01-01,2018-07-01`


Response:
```json
{
    "objectIdFieldName": "OBJECTID",
    "globalIdFieldName": "",
    "hasZ": false,
    "hasM": false,
    "spatialReference": {
        "wkid": 4326
    },
    "fields": [
        {
            "name": "OBJECTID",
            "type": "esriFieldTypeOID",
            "alias": "OBJECTID",
            "sqlType": "sqlTypeOther",
            "domain": null,
            "defaultValue": null
        },
        {
            "name": "eventCategory",
            "type": "esriFieldTypeString",
            "alias": "eventCategory",
            "sqlType": "sqlTypeOther",
            "domain": null,
            "defaultValue": null,
            "length": 128
        },
        {
            "name": "totalEvents",
            "type": "esriFieldTypeInteger",
            "alias": "totalEvents",
            "sqlType": "sqlTypeOther",
            "domain": null,
            "defaultValue": null
        }
    ],
    "features": [
        {
            "attributes": {
                "eventCategory": "API",
                "totalEvents": 9503,
                "OBJECTID": 2141521907
            }
        },
        {
            "attributes": {
                "eventCategory": "API Explorer",
                "totalEvents": 35130,
                "OBJECTID": 339333549
            }
        },
...
...
...
        {
            "attributes": {
                "eventCategory": "widgets",
                "totalEvents": 160570,
                "OBJECTID": 1460530564
            }
        }
    ],
    "exceededTransferLimit": false
}
```

### Top ten session counts by country for a date range
`http://localhost:8080/metrics/sessions/country/FeatureServer/0/query?time=2017-01-01,2018-07-01&orderByFields=sessions%20DESC&limit=10`

Response:
```json
{
    "objectIdFieldName": "OBJECTID",
    "globalIdFieldName": "",
    "hasZ": false,
    "hasM": false,
    "spatialReference": {
        "wkid": 4326
    },
    "fields": [
        {
            "name": "OBJECTID",
            "type": "esriFieldTypeOID",
            "alias": "OBJECTID",
            "sqlType": "sqlTypeOther",
            "domain": null,
            "defaultValue": null
        },
        {
            "name": "country",
            "type": "esriFieldTypeString",
            "alias": "country",
            "sqlType": "sqlTypeOther",
            "domain": null,
            "defaultValue": null,
            "length": 128
        },
        {
            "name": "sessions",
            "type": "esriFieldTypeInteger",
            "alias": "sessions",
            "sqlType": "sqlTypeOther",
            "domain": null,
            "defaultValue": null
        }
    ],
    "features": [
        {
            "attributes": {
                "country": "United States",
                "sessions": 3465985,
                "OBJECTID": 2115310799
            }
        },
        {
            "attributes": {
                "country": "Canada",
                "sessions": 344534,
                "OBJECTID": 1164473059
            }
        },
        {
            "attributes": {
                "country": "United Kingdom",
                "sessions": 259762,
                "OBJECTID": 1199712002
            }
        },
        {
            "attributes": {
                "country": "Colombia",
                "sessions": 164969,
                "OBJECTID": 463997413
            }
        },
        {
            "attributes": {
                "country": "Japan",
                "sessions": 111078,
                "OBJECTID": 660706644
            }
        },
        {
            "attributes": {
                "country": "Brazil",
                "sessions": 104631,
                "OBJECTID": 1916301181
            }
        },
        {
            "attributes": {
                "country": "Australia",
                "sessions": 100033,
                "OBJECTID": 200827751
            }
        },
        {
            "attributes": {
                "country": "New Zealand",
                "sessions": 70347,
                "OBJECTID": 266670080
            }
        },
        {
            "attributes": {
                "country": "Spain",
                "sessions": 52992,
                "OBJECTID": 1375456220
            }
        },
        {
            "attributes": {
                "country": "France",
                "sessions": 50162,
                "OBJECTID": 1909896837
            }
        }
    ],
    "exceededTransferLimit": false
}
```

### Multiple metrics, multiple dimensions
`http://localhost:8080/metrics/sessions::views/country::eventCategory/FeatureServer/0/query?time=2017-01-01,2018-07-01`

```json
{
    "objectIdFieldName": "OBJECTID",
    "globalIdFieldName": "",
    "hasZ": false,
    "hasM": false,
    "spatialReference": {
        "wkid": 4326
    },
    "fields": [
        {
            "name": "OBJECTID",
            "type": "esriFieldTypeOID",
            "alias": "OBJECTID",
            "sqlType": "sqlTypeOther",
            "domain": null,
            "defaultValue": null
        },
        {
            "name": "country",
            "type": "esriFieldTypeString",
            "alias": "country",
            "sqlType": "sqlTypeOther",
            "domain": null,
            "defaultValue": null,
            "length": 128
        },
        {
            "name": "eventCategory",
            "type": "esriFieldTypeString",
            "alias": "eventCategory",
            "sqlType": "sqlTypeOther",
            "domain": null,
            "defaultValue": null,
            "length": 128
        },
        {
            "name": "sessions",
            "type": "esriFieldTypeInteger",
            "alias": "sessions",
            "sqlType": "sqlTypeOther",
            "domain": null,
            "defaultValue": null
        },
        {
            "name": "views",
            "type": "esriFieldTypeInteger",
            "alias": "views",
            "sqlType": "sqlTypeOther",
            "domain": null,
            "defaultValue": null
        }
    ],
    "features": [
        {
            "attributes": {
                "country": "Australia",
                "eventCategory": "dataset",
                "sessions": 3,
                "views": 7,
                "OBJECTID": 1105561907
            }
        },
        ...
        ...
        ...
        {
            "attributes": {
                "country": "United States",
                "eventCategory": "Search",
                "sessions": 716,
                "views": 10475,
                "OBJECTID": 2012216286
            }
        }
    ],
    "exceededTransferLimit": false
}
```

### Dimension by eventCategory and filter with where
`http://localhost:8080/metrics/sessions::views/eventCategory/FeatureServer/0/query?where=(country='United States') AND views > 999`

```json
{
    "objectIdFieldName": "OBJECTID",
    "globalIdFieldName": "",
    "hasZ": false,
    "hasM": false,
    "spatialReference": {
        "wkid": 4326
    },
    "fields": [
        {
            "name": "views",
            "type": "esriFieldTypeInteger",
            "alias": "views",
            "sqlType": "sqlTypeOther",
            "domain": null,
            "defaultValue": null
        },
        {
            "name": "eventCategory",
            "type": "esriFieldTypeString",
            "alias": "eventCategory",
            "sqlType": "sqlTypeOther",
            "domain": null,
            "defaultValue": null,
            "length": 128
        },
        {
            "name": "sessions",
            "type": "esriFieldTypeInteger",
            "alias": "sessions",
            "sqlType": "sqlTypeOther",
            "domain": null,
            "defaultValue": null
        }
    ],
    "features": [
        {
            "attributes": {
                "sessions": 80831,
                "views": 157629,
                "eventCategory": "ArcGIS"
            }
        },
        ...
        ...
        {
            "attributes": {
                "sessions": 813,
                "views": 18397,
                "eventCategory": "Search"
            }
        }
    ],
    "exceededTransferLimit": false
}
```
