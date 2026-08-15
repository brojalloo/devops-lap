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
    }

    post {
        success {
            echo 'Pipeline CI terminé avec succès !'
        }

        failure {
            echo 'Pipeline CI échoué.'
        }

        always {
            echo 'Fin du pipeline.'
        }
    }
}
