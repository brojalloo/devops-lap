pipeline {
    agent any

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install') {
            steps {
                dir('app') {
                    sh 'npm ci'
                }
            }
        }

        stage('Test') {
            steps {
                dir('app') {
                    sh 'npm test -- --runInBand'
                }
            }
        }

        stage('Docker Build') {
            steps {
                dir('app') {
                    sh 'docker build -t devops-lab-api:jenkins .'
                }
            }
        }

        stage('Deploy') {
            steps {
                dir('app') {
                    sh 'docker compose up -d --build'
                }
            }
        }

        stage('Health Check') {
            steps {
                sh 'sleep 5'
                sh 'curl -f http://localhost:3000/health'
                sh 'curl -f http://localhost:3000/db-health'
            }
        }
    }

    post {
        success {
            echo 'CI/CD terminé avec succès !'
        }

        failure {
            echo 'Pipeline CI/CD échoué.'
        }

        always {
            echo 'Fin du pipeline.'
        }
    }
}
