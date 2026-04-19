pipeline {
    agent any

    environment {
        AWS_REGION = 'ap-south-1'
        AWS_ACCOUNT_ID = '992258813186'

        BACKEND_REPO = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/smart-campus-backend"
        FRONTEND_REPO = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/smart-campus-frontend"

        IMAGE_TAG = "${BUILD_NUMBER}"

        APP_HOST = '13.203.51.131'
        APP_USER = 'ubuntu'

        SSH_CRED_ID = 'ec2-ssh-key'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Backend Test') {
            steps {
                dir('campus-operations-hub') {
                    sh 'chmod +x mvnw'
                    sh './mvnw clean test'
                }
            }
        }

        stage('Frontend Build Check') {
            steps {
                dir('frontend') {
                    sh 'npm ci'
                    sh 'npm run build'
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
                        aws ecr get-login-password --region ${AWS_REGION} \
                        | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
                    '''
                }
            }
        }

        stage('Build Backend Image') {
            steps {
                dir('campus-operations-hub') {
                    sh '''
                        docker build -t ${BACKEND_REPO}:${IMAGE_TAG} .
                        docker tag ${BACKEND_REPO}:${IMAGE_TAG} ${BACKEND_REPO}:latest
                    '''
                }
            }
        }

        stage('Build Frontend Image') {
            steps {
                dir('frontend') {
                    sh '''
                        docker build -t ${FRONTEND_REPO}:${IMAGE_TAG} .
                        docker tag ${FRONTEND_REPO}:${IMAGE_TAG} ${FRONTEND_REPO}:latest
                    '''
                }
            }
        }

        stage('Push Images to ECR') {
            steps {
                sh '''
                    docker push ${BACKEND_REPO}:${IMAGE_TAG}
                    docker push ${BACKEND_REPO}:latest
                    docker push ${FRONTEND_REPO}:${IMAGE_TAG}
                    docker push ${FRONTEND_REPO}:latest
                '''
            }
        }

        stage('Deploy to App Server') {
            steps {
                sshagent(credentials: ['ec2-ssh-key']) {
                    sh '''
                        ssh -o StrictHostKeyChecking=no ${APP_USER}@${APP_HOST} "
                            mkdir -p ~/smart-campus-deploy &&
                            cd ~/smart-campus-deploy &&

                            echo BACKEND_TAG=${IMAGE_TAG} > .env.deploy &&
                            echo FRONTEND_TAG=${IMAGE_TAG} >> .env.deploy &&

                            aws ecr get-login-password --region ${AWS_REGION} \
                            | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com &&

                            cp .env.deploy previous_success.env.new || true &&

                            docker compose --env-file .env.deploy pull &&
                            docker compose --env-file .env.deploy up -d
                        "
                    '''
                }
            }
        }

        stage('Health Check') {
            steps {
                script {
                    sh '''
                        sleep 30
                        curl -k -f https://${APP_HOST} || exit 1
                    '''
                }
            }
        }

        stage('Mark Release Successful') {
            steps {
                sshagent(credentials: ['ec2-ssh-key']) {
                    sh '''
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
