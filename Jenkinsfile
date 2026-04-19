pipeline {
    agent any

    environment {
        AWS_REGION     = 'ap-south-1'
        AWS_ACCOUNT_ID = '992258813186'

        BACKEND_REPO  = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/smart-campus-backend"
        FRONTEND_REPO = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/smart-campus-frontend"

        IMAGE_TAG = "${BUILD_NUMBER}"

        APP_HOST = '10.0.0.192'
        APP_USER = 'ubuntu'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Backend Test') {
            steps {
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding',
                    credentialsId: 'aws-creds'
                ]]) {
                    dir('campus-operations-hub') {
                        sh '''
                            set -eu

                            SECRET_JSON=$(aws secretsmanager get-secret-value \
                              --region "${AWS_REGION}" \
                              --secret-id smart-campus/prod/backend \
                              --query SecretString \
                              --output text)

                            export SERVER_PORT=$(echo "$SECRET_JSON" | jq -r '.SERVER_PORT // "8080"')
                            export SPRING_DATASOURCE_URL=$(echo "$SECRET_JSON" | jq -r '.SPRING_DATASOURCE_URL')
                            export SPRING_DATASOURCE_USERNAME=$(echo "$SECRET_JSON" | jq -r '.SPRING_DATASOURCE_USERNAME')
                            export SPRING_DATASOURCE_PASSWORD=$(echo "$SECRET_JSON" | jq -r '.SPRING_DATASOURCE_PASSWORD')
                            export SPRING_DATASOURCE_DRIVER_CLASS_NAME=$(echo "$SECRET_JSON" | jq -r '.SPRING_DATASOURCE_DRIVER_CLASS_NAME // "org.postgresql.Driver"')

                            export SPRING_JPA_DATABASE_PLATFORM=$(echo "$SECRET_JSON" | jq -r '.SPRING_JPA_DATABASE_PLATFORM // "org.hibernate.dialect.PostgreSQLDialect"')
                            export SPRING_JPA_HIBERNATE_LOB=$(echo "$SECRET_JSON" | jq -r '.SPRING_JPA_HIBERNATE_LOB // "true"')
                            export SPRING_JPA_HIBERNATE_DDL_AUTO=$(echo "$SECRET_JSON" | jq -r '.SPRING_JPA_HIBERNATE_DDL_AUTO // "update"')
                            export SPRING_JPA_SHOW_SQL=$(echo "$SECRET_JSON" | jq -r '.SPRING_JPA_SHOW_SQL // "true"')
                            export SPRING_FLYWAY_ENABLED=$(echo "$SECRET_JSON" | jq -r '.SPRING_FLYWAY_ENABLED // "false"')

                            export JWT_SECRET=$(echo "$SECRET_JSON" | jq -r '.JWT_SECRET')
                            export JWT_ACCESS_TOKEN_EXPIRATION=$(echo "$SECRET_JSON" | jq -r '.JWT_ACCESS_TOKEN_EXPIRATION')
                            export JWT_REFRESH_TOKEN_EXPIRATION=$(echo "$SECRET_JSON" | jq -r '.JWT_REFRESH_TOKEN_EXPIRATION')

                            export SPRING_SERVLET_MULTIPART_MAX_FILE_SIZE=$(echo "$SECRET_JSON" | jq -r '.SPRING_SERVLET_MULTIPART_MAX_FILE_SIZE // "10MB"')
                            export SPRING_SERVLET_MULTIPART_MAX_REQUEST_SIZE=$(echo "$SECRET_JSON" | jq -r '.SPRING_SERVLET_MULTIPART_MAX_REQUEST_SIZE // "10MB"')

                            export LOGGING_LEVEL_COM_SMARTCAMPUS_OPERATIONS=$(echo "$SECRET_JSON" | jq -r '.LOGGING_LEVEL_COM_SMARTCAMPUS_OPERATIONS // "INFO"')

                            export GOOGLE_CLIENT_ID=$(echo "$SECRET_JSON" | jq -r '.GOOGLE_CLIENT_ID')
                            export GOOGLE_CLIENT_SECRET=$(echo "$SECRET_JSON" | jq -r '.GOOGLE_CLIENT_SECRET')

                            chmod +x mvnw
                            ./mvnw clean test
                        '''
                    }
                }
            }
        }

        stage('Frontend Build Check') {
            steps {
                dir('frontend') {
                    sh '''
                        set -eu
                        npm ci
                        npm run build
                    '''
                }
            }
        }

        stage('Login to ECR') {
            steps {
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding',
                    credentialsId: 'aws-creds'
                ]]) {
                    sh '''
                        set -eu
                        aws ecr get-login-password --region "${AWS_REGION}" | docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
                    '''
                }
            }
        }

        stage('Build Backend Image') {
            steps {
                dir('campus-operations-hub') {
                    sh '''
                        set -eu
                        docker build -t "${BACKEND_REPO}:${IMAGE_TAG}" .
                        docker tag "${BACKEND_REPO}:${IMAGE_TAG}" "${BACKEND_REPO}:latest"
                    '''
                }
            }
        }

        stage('Build Frontend Image') {
            steps {
                dir('frontend') {
                    sh '''
                        set -eu
                        docker build -t "${FRONTEND_REPO}:${IMAGE_TAG}" .
                        docker tag "${FRONTEND_REPO}:${IMAGE_TAG}" "${FRONTEND_REPO}:latest"
                    '''
                }
            }
        }

        stage('Push Images to ECR') {
            steps {
                sh '''
                    set -eu
                    docker push "${BACKEND_REPO}:${IMAGE_TAG}"
                    docker push "${BACKEND_REPO}:latest"
                    docker push "${FRONTEND_REPO}:${IMAGE_TAG}"
                    docker push "${FRONTEND_REPO}:latest"
                '''
            }
        }

        stage('Deploy to App Server') {
            steps {
                sshagent(credentials: ['ec2-ssh-key']) {
                    withCredentials([[
                        $class: 'AmazonWebServicesCredentialsBinding',
                        credentialsId: 'aws-creds'
                    ]]) {
                        sh """
ssh -o StrictHostKeyChecking=no ${APP_USER}@${APP_HOST} /bin/bash <<EOF
set -eu

mkdir -p ~/smart-campus-deploy
cd ~/smart-campus-deploy

if [ -f .env.deploy ]; then
    cp .env.deploy previous_success.env
fi

cat > .env.deploy <<EOT
BACKEND_TAG=${IMAGE_TAG}
FRONTEND_TAG=${IMAGE_TAG}
EOT

aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

aws secretsmanager get-secret-value \\
  --region ${AWS_REGION} \\
  --secret-id smart-campus/prod/backend \\
  --query SecretString \\
  --output text > secret.json

jq -r 'to_entries[] | "\\(.key)=\\(.value)"' secret.json > .env.backend

docker compose --env-file .env.deploy pull
docker compose --env-file .env.deploy up -d

rm -f secret.json
EOF
"""
                    }
                }
            }
        }

        stage('Health Check') {
            steps {
                sh '''
                    set -eu
                    sleep 30
                    curl -k -f https://maplinks.duckdns.org
                '''
            }
        }

        stage('Mark Release Successful') {
            steps {
                sshagent(credentials: ['ec2-ssh-key']) {
                    sh '''
                        set -eu
                        ssh -o StrictHostKeyChecking=no ${APP_USER}@${APP_HOST} "
                            cd ~/smart-campus-deploy &&
                            cp .env.deploy previous_success.env
                        "
                    '''
                }
            }
        }
    }

    post {
        failure {
            echo 'Deployment failed. Rolling back...'
            sshagent(credentials: ['ec2-ssh-key']) {
                sh '''
                    set +e
                    ssh -o StrictHostKeyChecking=no ${APP_USER}@${APP_HOST} "
                        cd ~/smart-campus-deploy &&
                        if [ -f previous_success.env ]; then
                            docker compose --env-file previous_success.env up -d
                        fi
                    "
                '''
            }
        }
    }
}
