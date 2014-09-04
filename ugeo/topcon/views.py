from django.shortcuts import render


# Create your views here.

def streetview(request):
    return render(request, 'index.html')

def overmap(request):
    return render(request, 'overmap.html')

def crossdomain(request):
    return render(request, 'crossdomain.xml')
