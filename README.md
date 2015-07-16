# Redshift Console

_Redshift Console_'s goal is to be the tool to monitor and manage a Redshift cluster. The first release has basic tools to monitor running queries, WLM queue and your tables/schemas.

After over a year of managing our Redshift cluster with a collection of scripts and queries, we decided to bundle this into a more user friendly tool that can be used by a wider audience. This project also aims to uncover all the useful information hidden in [Redshift's Developer Guide](http://docs.aws.amazon.com/redshift/latest/dg/) (such as the [table design status](http://docs.aws.amazon.com/redshift/latest/dg/c_analyzing-table-design.html) query).

![Screenshots](https://dl.dropboxusercontent.com/u/2186704/rdc_screenshots.gif)

### Features

* Inflight queries view with option to cancel any query and view related alerts (when available; from [STL_ALERT_EVENT_LOG](http://docs.aws.amazon.com/redshift/latest/dg/r_STL_ALERT_EVENT_LOG.html)).
* WLM queue view.
* Schemas view with additional information for each table including: total size (rows/MB), unsorted area size, is the table properly distributed and more.
* Load errors (aggregated view) from the past 24h, based on [STL_LOAD_ERRORS](http://docs.aws.amazon.com/redshift/latest/dg/r_STL_LOAD_ERRORS.html)

### Roadmap

This project is safe for usage, but still in its early stage (version 0.1). Future versions will include:

* Loads - Progress of current operations and history of recent ones.
* Vacuum status.
* SNS/CloudWatch integration to show metrics and events from AWS' console.
* Proactive notifications re. important events in the system: long running queries, problems, changes to the schema, dangerous levels of unsorted areas and more.

We are always happy to receive feedback and suggestions, especially if they are accompanied by a pull request.

## Usage

You can either use the PyPi package or the docker image.

#### PyPi

1. The easiest way to install the project is from pypi:

  ```bash
  $ pip install redshift-console
  ```

2. Settings are set from environment variables. The main setting to set is the connection string to your Redshift cluster: (make sure the user has sufficient permissions)

  ```bash
  $ export REDSHIFT_CONNECTION_STRING='user= password= host= port= dbname='
  ```

3. Start the server:

   ```bash
   $ redshift-console runserver
   Starting server on port 5000 (debug mode: False).
   ```
   
#### Docker
  ```bash
   $ docker run -e REDSHIFT_CONNECTION_STRING="user= password= host= port=5439 dbname=" -p 5000:5000 everythingme/redshift-console
   Starting server on port 5000 (debug mode: False).
   ```

## Authors

[Arik Fraimovich](http://github.com/arikfr) and [Oren Itamar](http://github.com/orenitamar).
