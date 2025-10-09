{{/*
Expand the name of the chart.
*/}}
{{- define "twinfeed.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "twinfeed.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "twinfeed.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "twinfeed.labels" -}}
helm.sh/chart: {{ include "twinfeed.chart" . }}
{{ include "twinfeed.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "twinfeed.selectorLabels" -}}
app.kubernetes.io/name: {{ include "twinfeed.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Backend selector labels
*/}}
{{- define "twinfeed.backend.selectorLabels" -}}
{{ include "twinfeed.selectorLabels" . }}
app.kubernetes.io/component: backend
{{- end }}

{{/*
Frontend selector labels
*/}}
{{- define "twinfeed.frontend.selectorLabels" -}}
{{ include "twinfeed.selectorLabels" . }}
app.kubernetes.io/component: frontend
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "twinfeed.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "twinfeed.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Backend image tag
*/}}
{{- define "twinfeed.backend.imageTag" -}}
{{- .Values.global.imageTag | default .Values.image.backend.tag }}
{{- end }}

{{/*
Frontend image tag
*/}}
{{- define "twinfeed.frontend.imageTag" -}}
{{- .Values.global.imageTag | default .Values.image.frontend.tag }}
{{- end }}

{{/*
Image pull policy
*/}}
{{- define "twinfeed.imagePullPolicy" -}}
{{- .Values.global.imagePullPolicy | default .Values.image.backend.pullPolicy }}
{{- end }}

{{/*
Backend API URL for frontend
*/}}
{{- define "twinfeed.backend.apiUrl" -}}
{{- if .Values.frontend.env.VITE_API_URL }}
{{- .Values.frontend.env.VITE_API_URL }}
{{- else if .Values.ingress.enabled }}
{{- $scheme := "http" }}
{{- if .Values.ingress.tls }}
{{- $scheme = "https" }}
{{- end }}
{{- $host := (index .Values.ingress.hosts 0).host }}
{{- printf "%s://%s/api/v1" $scheme $host }}
{{- else }}
{{- printf "http://%s-backend:%d/api/v1" (include "twinfeed.fullname" .) (.Values.backend.service.port | int) }}
{{- end }}
{{- end }}