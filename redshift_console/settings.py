import os


def load_settings(prefix, defaults):
    for k, v in defaults.iteritems():
        env_name = '%s_%s' % (prefix, k.upper())
        defaults[k] = os.environ.get(env_name, v)

    return defaults
    
DATA = load_settings('DATA', {
    'alerts_refresh_interval': 10,
    'inflight_refresh_interval': 60,
    'tables_refresh_interval': 600,
    'max_query_cancelation_retries': 100
})

API = load_settings('API', {
    'static_assets_path': './static/dist',
    'cookie_secret': '0nzScixK9yR6jmSMUudcSV7EpprZyZn6ox0M5Q9N',
})

REDSHIFT = load_settings('REDSHIFT', {
    'connection_string': 'user= password= host= port= dbname=',
    'connection_pool_min_size': 1,
    'connection_pool_max_size': 2
})
