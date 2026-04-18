$KEYWORD
$
$ Material properties submodel
$ Resolved via *INCLUDE_PATH_RELATIVE submodels
$
*PARAMETER
$#   prmr1      val1
R   youngs   210000.0
R   poisson      0.30
R    yield     0.180

*MAT_ELASTIC
$#     mid        ro         e        pr        da        db  not used
         1     7.85e-9  &youngs  &poisson
$
*MAT_PLASTIC_KINEMATIC
$#     mid        ro         e        pr      sigy      etan      beta
         2     7.85e-9  &youngs  &poisson   &yield
$
*END
