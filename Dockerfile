# Use official Python image as base
FROM python:3.9-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV HOME /home/jupyter
ENV SHELL /bin/bash

# Create user and set up directory
RUN useradd -m -s /bin/bash jupyter && \
    mkdir -p /home/jupyter/work && \
    chown jupyter:jupyter /home/jupyter/work

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Switch to jupyter user
USER jupyter
WORKDIR /home/jupyter/work

# Install JupyterLab and data science packages
RUN pip install --no-cache-dir --user \
    jupyterlab \
    numpy \
    pandas \
    matplotlib \
    seaborn \
    scipy \
    scikit-learn \
    statsmodels \
    notebook \
    ipywidgets \
    jupyter_contrib_nbextensions \
    jupyter_nbextensions_configurator \
    black \
    isort \
    flake8 \
    pylint

# Install Jupyter extensions
RUN jupyter nbextension enable --py widgetsnbextension && \
    jupyter labextension install @jupyter-widgets/jupyterlab-manager

# Set up Jupyter config
RUN mkdir -p /home/jupyter/.jupyter && \
    echo "c.NotebookApp.token = ''" > /home/jupyter/.jupyter/jupyter_notebook_config.py && \
    echo "c.NotebookApp.password = ''" >> /home/jupyter/.jupyter/jupyter_notebook_config.py && \
    echo "c.NotebookApp.ip = '0.0.0.0'" >> /home/jupyter/.jupyter/jupyter_notebook_config.py && \
    echo "c.NotebookApp.open_browser = False" >> /home/jupyter/.jupyter/jupyter_notebook_config.py && \
    echo "c.NotebookApp.notebook_dir = '/home/jupyter/work'" >> /home/jupyter/.jupyter/jupyter_notebook_config.py

# Add local bin to PATH
ENV PATH=/home/jupyter/.local/bin:$PATH

# Expose Jupyter port
EXPOSE 8888

# Start JupyterLab
CMD ["jupyter", "lab"]
