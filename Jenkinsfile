pipeline {
    agent any

    environment {
        AWS_REGION = 'eu-north-1'
        AWS_ACCOUNT_ID = '992258813186'
        BACKEND_IMAGE = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/smart-campus-backend"
        FRONTEND_IMAGE = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/smart-campus-frontend"
        IMAGE_TAG = "${BUILD_NUMBER}"
        APP_EC2_IP = '51.20.188.86'
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

        stage('Frontend Build') {
            steps {
                dir('frontend') {
                    sh 'npm ci'
                    sh 'npm run build'
                }
            }
        }

        stage('Build Backend Docker Image') {
            steps {
                dir('campus-operations-hub') {
                    sh "docker build -t ${BACKEND_IMAGE}:${IMAGE_TAG} -t ${BACKEND_IMAGE}:latest ."
                }
            }
        }

        stage('Build Frontend Docker Image') {
            steps {
                dir('frontend') {
                    sh "docker build -t ${FRONTEND_IMAGE}:${IMAGE_TAG} -t ${FRONTEND_IMAGE}:latest ."
                }
            }
        }

        stage('Push Images to ECR') {
            steps {
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding',
                    credentialsId: 'aws-creds'
                ]]) {
                    sh """
                        aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
                        docker push ${BACKEND_IMAGE}:${IMAGE_TAG}
                        docker push ${BACKEND_IMAGE}:latest
                        docker push ${FRONTEND_IMAGE}:${IMAGE_TAG}
                        docker push ${FRONTEND_IMAGE}:latest
                    """
                }
            }
        }

        stage('Deploy to App EC2') {
            steps {
                sshagent(['ec2-ssh-key']) {
                    sh """
                        ssh -o StrictHostKeyChecking=no ubuntu@${APP_EC2_IP} '
                            cd ~/smart-campus &&
                            ./deploy.sh
                        '
                    """
                }
            }
        }
    }

    post {
        success {
            echo 'Pipeline completed successfully.'
        }
        failure {
            echo 'Pipeline failed.'
        }
    }
}