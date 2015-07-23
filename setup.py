import os

import pip
from setuptools import setup, find_packages
from pip.req import parse_requirements

install_reqs = parse_requirements('requirements.txt', session=pip.download.PipSession())

def read_readme(path):
    with open(path, 'r') as f:
        content = f.read()

    try:
        import pypandoc
        content = pypandoc.convert(content, 'rst', format="md")

        # Remove screenshots, they don't render well on PyPi:
        content = content.replace('.. figure:: https://dl.dropboxusercontent.com/u/2186704/rdc_screenshots.gif\n   :alt: Screenshots\n\n   Screenshots\n\n', '')

        # Strip roadmap and everything below it:
        content = content.split('Roadmap\n-------\n\n')[0]

        # Bring back authors:
        content = content + "Authors\n-------\n\n`Arik Fraimovich <http://github.com/arikfr>`__ and `Oren\nItamar <http://github.com/orenitamar>`__.\n"

    except:
        print "Warning: pypandoc missing. Install it to convert README from Markdown to restructedText."

    return content

setup(
    name='redshift-console',
    version='0.1.3',
    description='Monitor and manage your Redshift cluster.',
    long_description=read_readme('README.md'),
    url='http://github.com/EverythingMe/redshift_console/',
    license='Apache',
    author='Arik Fraimovich, Oren Itamar',
    author_email='opensource@everything.me',
    packages=find_packages(exclude=['tests*']),
    include_package_data=True,
    install_requires=[str(ir.req) for ir in install_reqs],
    entry_points = {
        'console_scripts': ['redshift-console=redshift_console.__main__:cli'],
    },
    classifiers=[
        'License :: OSI Approved :: Apache Software License',
        'Programming Language :: Python',
    ],
)
